import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  ApiClient._(this._dio);

  final Dio _dio;

  static const _tokenKey = 'byot_access_token';
  static const _baseUrlKey = 'byot_base_url';
  /// Override at run time:
  ///   iOS Simulator (Mac): --dart-define=BYOT_API=http://localhost:8000
  ///   Android emulator:    --dart-define=BYOT_API=http://10.0.2.2:8000
  ///   Physical device:     --dart-define=BYOT_API=http://192.168.x.x:8000
  static const _defaultBaseUrl = String.fromEnvironment(
    'BYOT_API',
    defaultValue: 'http://localhost:8000',
  );

  String get baseUrl => _dio.options.baseUrl;

  static Future<ApiClient> create() async {
    final prefs = await SharedPreferences.getInstance();
    final base = prefs.getString(_baseUrlKey) ?? _defaultBaseUrl;
    final dio = Dio(BaseOptions(
      baseUrl: '$base/api/v1',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));
    final client = ApiClient._(dio);
    final token = prefs.getString(_tokenKey);
    if (token != null) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
    dio.interceptors.add(InterceptorsWrapper(
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 &&
            !error.requestOptions.path.contains('/auth/login')) {
          await client._clearToken();
        }
        handler.next(error);
      },
    ));
    return client;
  }

  static String? _parseDetail(dynamic data) {
    if (data == null) return null;
    if (data is String) return data;
    if (data is Map && data['detail'] != null) {
      final detail = data['detail'];
      if (detail is String) return detail;
      if (detail is List) {
        return detail
            .map((item) {
              if (item is Map) return item['msg']?.toString() ?? item.toString();
              return item.toString();
            })
            .join('; ');
      }
      return detail.toString();
    }
    return data.toString();
  }

  static String errorMessage(Object error) {
    if (error is! DioException) return error.toString();

    final status = error.response?.statusCode;
    final detail = _parseDetail(error.response?.data);
    final method = error.requestOptions.method;
    final uri = error.requestOptions.uri;

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Cannot reach the API at ${uri.origin}. '
          'From the repo root run: make up';
    }

    if (error.type == DioExceptionType.badResponse && status != null) {
      final message = switch (status) {
        401 => detail == 'invalid_credentials'
            ? 'Invalid email or password. Run `make seed` for the demo account.'
            : 'Not signed in or session expired. Sign out and sign in again.',
        403 => detail ?? 'You do not have permission for this action.',
        404 => detail ?? 'API route not found. Pull the latest code and check BYOT_API.',
        413 => detail ?? 'File too large (max 10 MB per photo).',
        422 => detail ?? 'Invalid request data.',
        500 || 502 || 503 => detail ?? 'Server error. Run `make logs` and check the backend.',
        _ => detail,
      };
      if (message != null && message.isNotEmpty) {
        return 'HTTP $status ($method $uri): $message';
      }
      return 'HTTP $status on $method $uri';
    }

    if (detail != null && detail.isNotEmpty) return detail;
    return error.message ?? error.toString();
  }

  static bool isUnauthorized(Object error) =>
      error is DioException && error.response?.statusCode == 401;

  bool get isAuthenticated => _dio.options.headers['Authorization'] != null;

  Future<void> setToken(String token) async {
    _dio.options.headers['Authorization'] = 'Bearer $token';
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> _clearToken() async {
    _dio.options.headers.remove('Authorization');
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<void> logout() async => _clearToken();

  Future<bool> validateSession() async {
    if (!isAuthenticated) return false;
    try {
      await me();
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) await _clearToken();
      return false;
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final r = await _dio.post('/auth/login', data: {'email': email, 'password': password});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> me() async =>
      Map<String, dynamic>.from((await _dio.get('/auth/me')).data);

  Future<Map<String, dynamic>> dashboard() async =>
      Map<String, dynamic>.from((await _dio.get('/dashboard')).data);

  Future<List<dynamic>> listTrees() async {
    final r = await _dio.get('/trees');
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
    List<String> photoKeys = const [],
  }) async {
    final r = await _dio.post('/trees', data: {
      'species_text': speciesText,
      'planted_at': plantedAt,
      'latitude': lat,
      'longitude': lon,
      'altitude_m': altitude,
      'accuracy_m': accuracy,
      'photo_keys': photoKeys,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<String> uploadTreePhoto(String filePath) async {
    final filename = filePath.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filename,
        contentType: DioMediaType.parse(_mimeForPath(filePath)),
      ),
    });
    final r = await _dio.post<Map<String, dynamic>>(
      '/trees/uploads/photo',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        headers: Map<String, dynamic>.from(_dio.options.headers),
      ),
    );
    return r.data!['key'] as String;
  }

  static String _mimeForPath(String path) {
    final ext = path.split('.').last.toLowerCase();
    return switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      'gif' => 'image/gif',
      _ => 'image/jpeg',
    };
  }

  Future<Map<String, dynamic>> runAnalysis(String treeId) async {
    final r = await _dio.post('/tree-analysis', data: {'tree_id': treeId, 'mode': 'full'});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> assistant(String prompt) async {
    final r = await _dio.post('/assistant/query', data: {'prompt': prompt});
    return Map<String, dynamic>.from(r.data);
  }
}
