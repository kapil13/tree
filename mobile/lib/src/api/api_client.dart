import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_errors.dart';
import '../session.dart';

/// API base URL without trailing slash, e.g. https://api.aranyix.tech
const String kByotApiBase = String.fromEnvironment(
  'BYOT_API',
  defaultValue: 'https://api.aranyix.tech',
);

class ApiClient {
  ApiClient._(this._dio, this._prefs);

  final Dio _dio;
  final SharedPreferences _prefs;
  bool _refreshing = false;

  static const _tokenKey = 'byot_access_token';
  static const _refreshKey = 'byot_refresh_token';
  static const _baseUrlKey = 'byot_base_url';

  static Future<String> loadBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_baseUrlKey) ?? kByotApiBase;
  }

  static Future<void> saveBaseUrl(String url) async {
    final normalized = url.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, normalized);
  }

  static Future<ApiClient> create() async {
    final prefs = await SharedPreferences.getInstance();
    final base = prefs.getString(_baseUrlKey) ?? kByotApiBase;
    final dio = Dio(BaseOptions(
      baseUrl: '$base/api/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 45),
      headers: {'Content-Type': 'application/json'},
    ));
    final client = ApiClient._(dio, prefs);
    final token = prefs.getString(_tokenKey);
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
              opts.headers['Authorization'] = 'Bearer ${client._prefs.getString(_tokenKey)}';
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

  Future<bool> _refreshAccessToken() async {
    if (_refreshing) return false;
    final refresh = _prefs.getString(_refreshKey);
    if (refresh == null) return false;
    _refreshing = true;
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
    } finally {
      _refreshing = false;
    }
  }

  Future<void> _clearSession() async {
    _dio.options.headers.remove('Authorization');
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_refreshKey);
    sessionController.signOut();
  }

  Future<void> setTokens({required String accessToken, String? refreshToken}) async {
    _dio.options.headers['Authorization'] = 'Bearer $accessToken';
    await _prefs.setString(_tokenKey, accessToken);
    if (refreshToken != null) {
      await _prefs.setString(_refreshKey, refreshToken);
    }
    sessionController.setAuthenticated(true);
  }

  Future<void> setToken(String token) => setTokens(accessToken: token);

  Future<void> logout() async {
    await _clearSession();
  }

  Future<bool> hasStoredToken() async => _prefs.getString(_tokenKey) != null;

  String get baseUrl => _dio.options.baseUrl.replaceAll('/api/v1', '');

  String publicTreeUrl(String publicCode) {
    final host = Uri.parse(baseUrl).host;
    if (host.startsWith('api.')) {
      return 'https://${host.substring(4)}/p/$publicCode';
    }
    return '$baseUrl/p/$publicCode';
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final r = await _dio.post('/auth/login', data: {'email': email, 'password': password});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> me() async =>
      Map<String, dynamic>.from((await _dio.get('/auth/me')).data);

  Future<Map<String, dynamic>> dashboard() async =>
      Map<String, dynamic>.from((await _dio.get('/dashboard')).data);

  Future<List<dynamic>> listTrees({int pageSize = 200}) async {
    final r = await _dio.get('/trees', queryParameters: {'page': 1, 'page_size': pageSize});
    return List<dynamic>.from(r.data['items'] ?? []);
  }

  Future<Map<String, dynamic>> getTree(String id) async =>
      Map<String, dynamic>.from((await _dio.get('/trees/$id')).data);

  Future<Map<String, dynamic>> createTree({
    required String speciesText,
    String? plantedAt,
    required double lat,
    required double lon,
    double? altitude,
    double? accuracy,
  }) async {
    final r = await _dio.post('/trees', data: {
      'species_text': speciesText,
      'planted_at': plantedAt,
      'latitude': lat,
      'longitude': lon,
      'altitude_m': altitude,
      'accuracy_m': accuracy,
      'photo_keys': [],
    });
    return Map<String, dynamic>.from(r.data);
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
    return List<dynamic>.from(r.data);
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
    return List<dynamic>.from(r.data);
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

  Future<Map<String, dynamic>> analyzeBioacousticRecording(String id) async {
    final r = await _dio.post('/bioacoustic/recordings/$id/analyze');
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> bioacousticSummary() async {
    final r = await _dio.get('/bioacoustic/summary');
    return Map<String, dynamic>.from(r.data);
  }
}
