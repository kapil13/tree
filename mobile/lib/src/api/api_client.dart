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

  static Future<ApiClient> create() async {
    final prefs = await SharedPreferences.getInstance();
    final base = prefs.getString(_baseUrlKey) ?? _defaultBaseUrl;
    final dio = Dio(BaseOptions(
      baseUrl: '$base/api/v1',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));
    final token = prefs.getString(_tokenKey);
    if (token != null) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
    return ApiClient._(dio);
  }

  Future<void> setToken(String token) async {
    _dio.options.headers['Authorization'] = 'Bearer $token';
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> logout() async {
    _dio.options.headers.remove('Authorization');
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
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

  Future<Map<String, dynamic>> assistant(String prompt) async {
    final r = await _dio.post('/assistant/query', data: {'prompt': prompt});
    return Map<String, dynamic>.from(r.data);
  }
}
