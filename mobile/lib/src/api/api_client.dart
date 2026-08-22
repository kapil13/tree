import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_base_url.dart';
import 'api_errors.dart';
import '../services/certificate_pinning.dart';
import '../session.dart';

export 'api_base_url.dart' show kByotApiBase, allowCustomApiBase;

class ApiClient {
  ApiClient._(this._dio, this._prefs, this._secure);

  final Dio _dio;
  final SharedPreferences _prefs;
  final FlutterSecureStorage _secure;
  Future<bool>? _refreshFuture;

  static const _tokenKey = 'byot_access_token';
  static const _refreshKey = 'byot_refresh_token';
  static const _baseUrlKey = 'byot_base_url';

  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    // ignore: deprecated_member_use — task requires encryptedSharedPreferences
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<String> loadBaseUrl() async {
    if (!allowCustomApiBase) {
      return kByotApiBase;
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_baseUrlKey) ?? kByotApiBase;
  }

  static Future<void> saveBaseUrl(String url) async {
    final normalized = normalizeApiBaseUrl(url);
    assertAllowedApiBaseUrl(normalized);
    if (!allowCustomApiBase) {
      // Release builds without BYOT_ALLOW_CUSTOM_API keep the production default.
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, normalized);
  }

  static Future<void> _migrateTokensIfNeeded(
    SharedPreferences prefs,
    FlutterSecureStorage secure,
  ) async {
    final secureAccess = await secure.read(key: _tokenKey);
    if (secureAccess != null && secureAccess.isNotEmpty) {
      return;
    }
    final legacyAccess = prefs.getString(_tokenKey);
    if (legacyAccess == null || legacyAccess.isEmpty) {
      return;
    }
    await secure.write(key: _tokenKey, value: legacyAccess);
    final legacyRefresh = prefs.getString(_refreshKey);
    if (legacyRefresh != null && legacyRefresh.isNotEmpty) {
      await secure.write(key: _refreshKey, value: legacyRefresh);
    }
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshKey);
  }

  static Future<ApiClient> create() async {
    final prefs = await SharedPreferences.getInstance();
    const secure = _secureStorage;
    await _migrateTokensIfNeeded(prefs, secure);

    final base = await loadBaseUrl();
    final dio = Dio(BaseOptions(
      baseUrl: '$base/api/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 45),
      headers: {'Content-Type': 'application/json'},
    ));
    CertificatePinning.configureDio(dio);
    final client = ApiClient._(dio, prefs, secure);
    final token = await secure.read(key: _tokenKey);
    if (token != null) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
    dio.interceptors.add(InterceptorsWrapper(
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 &&
            error.requestOptions.extra['retried'] != true) {
          final refreshed = await client._refreshAccessToken();
          if (refreshed) {
            try {
              final opts = error.requestOptions;
              opts.extra['retried'] = true;
              final access = await client._secure.read(key: _tokenKey);
              opts.headers['Authorization'] = 'Bearer $access';
              final response = await dio.fetch(opts);
              return handler.resolve(response);
            } catch (_) {
              // fall through to sign out
            }
          }
          await client._clearSession();
          return handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              response: error.response,
              type: DioExceptionType.badResponse,
              error: const SessionExpiredException(),
            ),
          );
        }
        handler.next(error);
      },
    ));
    return client;
  }

  Future<bool> _refreshAccessToken() {
    return _refreshFuture ??= _refreshAccessTokenImpl().whenComplete(() {
      _refreshFuture = null;
    });
  }

  Future<bool> _refreshAccessTokenImpl() async {
    final refresh = await _secure.read(key: _refreshKey);
    if (refresh == null) return false;
    try {
      final r = await _dio.post(
        '/auth/refresh',
        data: {'refresh_token': refresh},
        options: Options(extra: {'retried': true}),
      );
      final data = Map<String, dynamic>.from(r.data);
      await setTokens(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String?,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _clearSession() async {
    _dio.options.headers.remove('Authorization');
    await _secure.delete(key: _tokenKey);
    await _secure.delete(key: _refreshKey);
    // Clear any leftover legacy prefs tokens.
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_refreshKey);
    sessionController.signOut();
  }

  Future<void> setTokens({required String accessToken, String? refreshToken}) async {
    _dio.options.headers['Authorization'] = 'Bearer $accessToken';
    await _secure.write(key: _tokenKey, value: accessToken);
    if (refreshToken != null) {
      await _secure.write(key: _refreshKey, value: refreshToken);
    }
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_refreshKey);
    sessionController.setAuthenticated(true);
  }

  Future<void> setToken(String token) => setTokens(accessToken: token);

  Future<void> logout() async {
    final refresh = await _secure.read(key: _refreshKey);
    if (refresh != null) {
      try {
        await _dio.post(
          '/auth/logout',
          data: {'refresh_token': refresh},
          options: Options(extra: {'retried': true}),
        );
      } catch (_) {
        // Best-effort revoke — still clear local session.
      }
    }
    await _clearSession();
  }

  Future<bool> hasStoredToken() async {
    final token = await _secure.read(key: _tokenKey);
    return token != null && token.isNotEmpty;
  }

  String get baseUrl => _dio.options.baseUrl.replaceAll('/api/v1', '');

  String publicTreeUrl(String publicCode) {
    final host = Uri.parse(baseUrl).host;
    if (host.startsWith('api.')) {
      return 'https://${host.substring(4)}/p/$publicCode';
    }
    return '$baseUrl/p/$publicCode';
  }

  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    String? captchaToken,
  }) async {
    final r = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
      'captcha_token': captchaToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> requestOtp({
    String? email,
    String? phone,
    String? captchaToken,
  }) async {
    final r = await _dio.post('/auth/otp/request', data: {
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      'captcha_token': captchaToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> verifyOtp({
    String? email,
    String? phone,
    required String code,
    String? fullName,
  }) async {
    final r = await _dio.post('/auth/otp/verify', data: {
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      'code': code,
      if (fullName != null) 'full_name': fullName,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> requestPasswordReset({
    required String email,
    String? captchaToken,
  }) async {
    final r = await _dio.post('/auth/password-reset/request', data: {
      'email': email,
      'captcha_token': captchaToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> confirmPasswordReset({
    required String email,
    required String code,
    required String password,
    String? captchaToken,
  }) async {
    final r = await _dio.post('/auth/password-reset/confirm', data: {
      'email': email,
      'code': code,
      'password': password,
      'captcha_token': captchaToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> googleAuthorize() async {
    final r = await _dio.get('/auth/google/login');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> submitOrgProfile(Map<String, dynamic> payload) async {
    final r = await _dio.post('/auth/onboarding/org-profile', data: payload);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> captchaConfig() async =>
      Map<String, dynamic>.from((await _dio.get('/auth/captcha-config')).data);

  Future<Map<String, dynamic>> signupStart({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required String signupCategory,
    String? captchaToken,
  }) async {
    final r = await _dio.post('/auth/signup/start', data: {
      'full_name': fullName,
      'email': email,
      'phone': phone,
      'password': password,
      'signup_category': signupCategory,
      'captcha_token': captchaToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> signupVerifyPhone({
    required String signupToken,
    required String code,
  }) async {
    await _dio.post('/auth/signup/verify-phone', data: {
      'signup_token': signupToken,
      'code': code,
    });
  }

  Future<Map<String, dynamic>> signupSendEmailOtp(String signupToken) async {
    final r = await _dio.post('/auth/signup/send-email-otp', data: {
      'signup_token': signupToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> signupComplete({
    required String signupToken,
    required String code,
  }) async {
    final r = await _dio.post('/auth/signup/complete', data: {
      'signup_token': signupToken,
      'code': code,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> onboardingState() async =>
      Map<String, dynamic>.from((await _dio.get('/auth/onboarding')).data);

  Future<Map<String, dynamic>> me() async =>
      Map<String, dynamic>.from((await _dio.get('/auth/me')).data);

  Future<Map<String, dynamic>> updateProfile({
    required String fullName,
    String? phone,
    String? locale,
    String? dateOfBirth,
    String? dateOfMarriage,
    String? city,
    String? state,
  }) async {
    final r = await _dio.patch('/auth/me', data: {
      'full_name': fullName,
      'phone': phone,
      if (locale != null) 'locale': locale,
      'date_of_birth': dateOfBirth,
      'date_of_marriage': dateOfMarriage,
      'city': city,
      'state': state,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> previewOrgInvite(String token) async {
    final r = await _dio.get(
      '/organizations/invites/preview',
      queryParameters: {'token': token},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> acceptOrgInvite(String inviteToken) async {
    final r = await _dio.post(
      '/organizations/invites/accept',
      data: {'invite_token': inviteToken},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> dashboard() async =>
      Map<String, dynamic>.from((await _dio.get('/dashboard')).data);

  Future<List<dynamic>> listTrees({
    int page = 1,
    int pageSize = 100,
    String? bbox,
  }) async {
    final params = <String, dynamic>{'page': page, 'page_size': pageSize};
    if (bbox != null && bbox.isNotEmpty) {
      params['bbox'] = bbox;
    }
    final r = await _dio.get('/trees', queryParameters: params);
    return List<dynamic>.from(r.data['items'] ?? []);
  }

  Future<Map<String, dynamic>> getTree(String id) async =>
      Map<String, dynamic>.from((await _dio.get('/trees/$id')).data);

  Future<Map<String, dynamic>> createTree({
    required String programCode,
    required String speciesText,
    String? plantedAt,
    required double lat,
    required double lon,
    double? altitude,
    double? accuracy,
    List<String> photoKeys = const [],
    Map<String, dynamic> metadata = const {},
    String? workAreaId,
    Map<String, dynamic>? initialMeasurement,
  }) async {
    final r = await _dio.post('/trees', data: {
      'program_code': programCode,
      'species_text': speciesText,
      'planted_at': plantedAt,
      'latitude': lat,
      'longitude': lon,
      'altitude_m': altitude,
      'accuracy_m': accuracy,
      'photo_keys': photoKeys,
      'metadata': metadata,
      if (workAreaId != null) ...{
        'work_area_id': workAreaId,
        'plantation_id': workAreaId,
      },
      if (initialMeasurement != null) 'initial_measurement': initialMeasurement,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> fieldOpsSummary() async =>
      Map<String, dynamic>.from((await _dio.get('/planting-projects/field-ops-summary')).data);

  Future<Map<String, dynamic>> monitoringSummary() async =>
      Map<String, dynamic>.from((await _dio.get('/planting-projects/monitoring-summary')).data);

  Future<Map<String, dynamic>> createWorkArea(
    String projectId, {
    required String name,
    required String geometryType,
    Map<String, dynamic>? boundary,
    Map<String, dynamic>? centerline,
    double? bufferM,
  }) async {
    final r = await _dio.post('/planting-projects/$projectId/work-areas', data: {
      'name': name,
      'geometry_type': geometryType,
      if (boundary != null) 'boundary': boundary,
      if (centerline != null) 'centerline': centerline,
      if (bufferM != null) 'buffer_m': bufferM,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<List<dynamic>> listComplianceViolations(String projectId, {bool unresolvedOnly = true}) async {
    final r = await _dio.get(
      '/planting-projects/$projectId/compliance-violations',
      queryParameters: {'unresolved_only': unresolvedOnly},
    );
    return List<dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> resolveViolation(String projectId, String violationId) async {
    final r = await _dio.post(
      '/planting-projects/$projectId/compliance-violations/$violationId/resolve',
    );
    return Map<String, dynamic>.from(r.data is Map ? r.data : {'status': 'ok'});
  }

  Future<Map<String, dynamic>> survivalDue(String projectId) async =>
      Map<String, dynamic>.from((await _dio.get('/planting-projects/$projectId/survival-due')).data);

  Future<Map<String, dynamic>> regeotagTree(
    String treeId, {
    required double lat,
    required double lon,
    double? accuracy,
    String? remarks,
    String? survivalStatus,
    double? dbhCm,
    double? heightM,
    double? canopyM,
    String? method,
    String? instrument,
  }) async {
    final r = await _dio.post('/trees/$treeId/regeotag', data: {
      'latitude': lat,
      'longitude': lon,
      if (accuracy != null) 'accuracy_m': accuracy,
      if (remarks != null) 'remarks': remarks,
      if (survivalStatus != null) 'survival_status': survivalStatus,
      if (dbhCm != null) 'dbh_cm': dbhCm,
      if (heightM != null) 'height_m': heightM,
      if (canopyM != null) 'canopy_m': canopyM,
      if (method != null) 'method': method,
      if (instrument != null) 'instrument': instrument,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> listTreeMeasurements(
    String treeId, {
    int page = 1,
    int pageSize = 50,
  }) async {
    final r = await _dio.get('/trees/$treeId/measurements', queryParameters: {
      'page': page,
      'page_size': pageSize,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getAlertPreferences() async =>
      Map<String, dynamic>.from((await _dio.get('/alerts/preferences')).data);

  Future<Map<String, dynamic>> updateAlertPreferences(Map<String, dynamic> body) async {
    final r = await _dio.patch('/alerts/preferences', data: body);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> carbonEstimate({
    required String species,
    double? dbhCm,
    double? heightM,
    double? ageYears,
  }) async {
    final r = await _dio.post('/carbon/estimate', data: {
      'species': species,
      if (dbhCm != null) 'dbh_cm': dbhCm,
      if (heightM != null) 'height_m': heightM,
      if (ageYears != null) 'age_years': ageYears,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> creditsSummary() async =>
      Map<String, dynamic>.from((await _dio.get('/credits/summary')).data);

  Future<List<dynamic>> listReports() async {
    final r = await _dio.get('/reports');
    return List<dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> createReport({
    required String reportType,
    required String format,
    String? plantationFenceId,
  }) async {
    final r = await _dio.post(
      '/reports',
      queryParameters: {
        'kind': reportType,
        'format': format,
        if (plantationFenceId != null) 'plantation_fence_id': plantationFenceId,
      },
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<List<dynamic>> listPlantingProjects({String? segment, int pageSize = 100}) async {
    final r = await _dio.get('/planting-projects', queryParameters: {
      'page': 1,
      'page_size': pageSize,
      if (segment != null) 'segment': segment,
    });
    return List<dynamic>.from(r.data['items'] ?? []);
  }

  Future<Map<String, dynamic>> getPlantingProject(String id) async =>
      Map<String, dynamic>.from((await _dio.get('/planting-projects/$id')).data);

  Future<List<dynamic>> listWorkAreas(String projectId) async {
    final r = await _dio.get('/planting-projects/$projectId/work-areas');
    return List<dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> complianceCheck(
    String projectId, {
    required String workAreaId,
    required double lat,
    required double lon,
    double? accuracy,
    String? speciesText,
    required int photoCount,
    Map<String, dynamic> metadata = const {},
  }) async {
    final r = await _dio.post('/planting-projects/$projectId/compliance-check', data: {
      'work_area_id': workAreaId,
      'latitude': lat,
      'longitude': lon,
      'accuracy_m': accuracy,
      'species_text': speciesText,
      'photo_count': photoCount,
      'metadata': metadata,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> registrationContext(
    String projectId, {
    String? workAreaId,
  }) async {
    final r = await _dio.get(
      '/planting-projects/$projectId/registration-context',
      queryParameters: workAreaId != null ? {'work_area_id': workAreaId} : null,
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<List<dynamic>> listEnrolledPlantingPrograms() async {
    final r = await _dio.get('/planting-programs/enrolled');
    return List<dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> plantingProgramMemberships() async {
    final r = await _dio.get('/planting-programs/me/memberships');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> updatePlantingProgramMemberships(List<String> programCodes) async {
    final r = await _dio.put('/planting-programs/me/memberships', data: {
      'program_codes': programCodes,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<String> uploadImageFile(String filePath, {String? filename}) async {
    final name = filename ?? filePath.split('/').last;
    final presign = Map<String, dynamic>.from(
      (await _dio.post('/uploads/presign', data: {
        'filename': name,
        'content_type': 'image/jpeg',
      })).data,
    );
    final uploadUrl = presign['upload_url'] as String;
    final s3Key = presign['s3_key'] as String;
    await Dio().put(
      uploadUrl,
      data: await File(filePath).readAsBytes(),
      options: Options(headers: {'Content-Type': presign['content_type'] ?? 'image/jpeg'}),
    );
    return s3Key;
  }

  Future<Map<String, dynamic>> runAnalysis(String treeId) async {
    final r = await _dio.post('/tree-analysis', data: {'tree_id': treeId, 'mode': 'full'});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>?> getSatelliteHealthLatest(String treeId) async {
    try {
      final r = await _dio.get('/satellite-health/trees/$treeId/latest');
      return Map<String, dynamic>.from(r.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<Map<String, dynamic>> runSatelliteHealth(String treeId) async {
    final r = await _dio.post('/satellite-health/trees/$treeId');
    return Map<String, dynamic>.from(r.data);
  }

  Future<List<dynamic>> listAlerts({bool unreadOnly = false}) async {
    final r = await _dio.get(
      '/alerts',
      queryParameters: unreadOnly ? {'unread_only': true} : null,
    );
    final data = r.data;
    if (data is Map && data['items'] is List) {
      return List<dynamic>.from(data['items'] as List);
    }
    return List<dynamic>.from(data as List);
  }

  Future<void> markAlertRead(String alertId) async {
    await _dio.post('/alerts/$alertId/read');
  }

  Future<Map<String, dynamic>> assistant(String prompt) async {
    final r = await _dio.post('/assistant/query', data: {'prompt': prompt});
    return Map<String, dynamic>.from(r.data);
  }

  Future<List<dynamic>> listBioacousticRecordings() async {
    final r = await _dio.get('/bioacoustic/recordings');
    final data = r.data;
    if (data is Map && data['items'] is List) {
      return List<dynamic>.from(data['items'] as List);
    }
    return List<dynamic>.from(data as List);
  }

  Future<List<dynamic>> listPlantationFences() async {
    final r = await _dio.get('/plantation-fences', queryParameters: {'page_size': 100});
    return List<dynamic>.from(r.data['items'] ?? []);
  }

  Future<Map<String, dynamic>> weatherForecast({
    required double latitude,
    required double longitude,
    int days = 3,
  }) async {
    final r = await _dio.get(
      '/weather/forecast',
      queryParameters: {'latitude': latitude, 'longitude': longitude, 'days': days},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getEcosystemHealth(String fenceId) async {
    final r = await _dio.get('/plantation-fences/$fenceId/ecosystem-health');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> uploadBioacousticRecording({
    required String filePath,
    required double durationSeconds,
    required double latitude,
    required double longitude,
    String? plantationFenceId,
  }) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: 'recording.m4a'),
      'duration_seconds': durationSeconds,
      'latitude': latitude,
      'longitude': longitude,
      if (plantationFenceId != null) 'plantation_fence_id': plantationFenceId,
    });
    final r = await _dio.post('/bioacoustic/recordings/upload', data: form);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getBioacousticRecording(String id) async {
    final r = await _dio.get('/bioacoustic/recordings/$id');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> analyzeBioacousticRecording(String id, {bool force = false}) async {
    final r = await _dio.post(
      '/bioacoustic/recordings/$id/analyze',
      queryParameters: force ? {'force': true} : null,
    );
    final data = Map<String, dynamic>.from(r.data);
    final status = data['status'] as String? ?? '';
    if (status == 'analyzed') {
      return getBioacousticRecording(id);
    }
    return _pollBioacousticRecording(id);
  }

  Future<Map<String, dynamic>> _pollBioacousticRecording(String id) async {
    for (var i = 0; i < 90; i++) {
      await Future.delayed(const Duration(seconds: 2));
      final rec = await getBioacousticRecording(id);
      final status = rec['status'] as String? ?? '';
      if (status == 'analyzed') return rec;
      if (status == 'failed') {
        throw DioException(
          requestOptions: RequestOptions(path: '/bioacoustic/recordings/$id'),
          error: rec['analysis_error'] ?? 'Bioacoustic analysis failed',
        );
      }
    }
    throw DioException(
      requestOptions: RequestOptions(path: '/bioacoustic/recordings/$id'),
      error: 'Bioacoustic analysis timed out',
    );
  }

  Future<Map<String, dynamic>> bioacousticSummary() async {
    final r = await _dio.get('/bioacoustic/summary');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> regionalFauna({
    required double latitude,
    required double longitude,
    String? taxonGroup,
  }) async {
    final r = await _dio.get(
      '/bioacoustic/regional-fauna',
      queryParameters: {
        'latitude': latitude,
        'longitude': longitude,
        if (taxonGroup != null) 'taxon_group': taxonGroup,
      },
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTreeByPublicCode(String publicCode) async {
    final r = await _dio.get('/trees/by-code/${Uri.encodeComponent(publicCode)}');
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> registerDevice({
    required String pushToken,
    required String platform,
    String? deviceLabel,
    String? appVersion,
  }) async {
    await _dio.post('/devices/register', data: {
      'push_token': pushToken,
      'platform': platform,
      if (deviceLabel != null) 'device_label': deviceLabel,
      if (appVersion != null) 'app_version': appVersion,
    });
  }

  Future<void> unregisterDevice({required String pushToken}) async {
    await _dio.delete(
      '/devices/register',
      queryParameters: {'push_token': pushToken},
    );
  }

  Future<void> postAnalyticsEvents(List<Map<String, dynamic>> events) async {
    await _dio.post('/devices/analytics/events', data: {
      'events': events,
    });
  }

  Future<Map<String, dynamic>> citizenProfile() async {
    final r = await _dio.get('/citizen/profile');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> citizenStewardship() async {
    final r = await _dio.get('/citizen/stewardship');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> citizenSignupStart({
    required String fullName,
    required String phone,
    required String password,
    String? captchaToken,
  }) async {
    final r = await _dio.post('/citizen/signup/start', data: {
      'full_name': fullName,
      'phone': phone,
      'password': password,
      if (captchaToken != null) 'captcha_token': captchaToken,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> citizenSignupComplete({
    required String signupToken,
    required String code,
  }) async {
    final r = await _dio.post('/citizen/signup/complete', data: {
      'signup_token': signupToken,
      'code': code,
    });
    return Map<String, dynamic>.from(r.data);
  }
}
