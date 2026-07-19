import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';

enum TreeQueueStatus { pending, syncing, failed }

class QueuedTreeRegistration {
  const QueuedTreeRegistration({
    required this.id,
    required this.payloadJson,
    required this.localPhotoPaths,
    required this.createdAt,
    required this.status,
    this.errorMessage,
    this.retryCount = 0,
  });

  final String id;
  final String payloadJson;
  final String localPhotoPaths;
  final DateTime createdAt;
  final TreeQueueStatus status;
  final String? errorMessage;
  final int retryCount;

  Map<String, dynamic> get payload =>
      Map<String, dynamic>.from(jsonDecode(payloadJson) as Map);

  List<String> get photoPaths =>
      localPhotoPaths.isEmpty ? [] : localPhotoPaths.split('|');

  QueuedTreeRegistration copyWith({
    TreeQueueStatus? status,
    String? errorMessage,
    int? retryCount,
  }) {
    return QueuedTreeRegistration(
      id: id,
      payloadJson: payloadJson,
      localPhotoPaths: localPhotoPaths,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  static QueuedTreeRegistration fromMap(Map<String, Object?> row) {
    return QueuedTreeRegistration(
      id: row['id'] as String,
      payloadJson: row['payload_json'] as String,
      localPhotoPaths: row['local_photo_paths'] as String? ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int),
      status: TreeQueueStatus.values[row['status'] as int],
      errorMessage: row['error_message'] as String?,
      retryCount: row['retry_count'] as int? ?? 0,
    );
  }

  Map<String, Object?> toMap() => {
        'id': id,
        'payload_json': payloadJson,
        'local_photo_paths': localPhotoPaths,
        'created_at': createdAt.millisecondsSinceEpoch,
        'status': status.index,
        'error_message': errorMessage,
        'retry_count': retryCount,
      };
}

class TreeRegistrationQueue extends ChangeNotifier {
  Database? _db;

  Future<void> init() async {
    _db ??= await openDatabase(
      'tree_registration_queue.db',
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE tree_queue (
            id TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            local_photo_paths TEXT,
            created_at INTEGER NOT NULL,
            status INTEGER NOT NULL,
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
    );
  }

  Future<void> enqueue({
    required String id,
    required Map<String, dynamic> payload,
    List<String> localPhotoPaths = const [],
  }) async {
    await init();
    await _db!.insert('tree_queue', {
      'id': id,
      'payload_json': jsonEncode(payload),
      'local_photo_paths': localPhotoPaths.join('|'),
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'status': TreeQueueStatus.pending.index,
      'retry_count': 0,
    });
    notifyListeners();
  }

  Future<List<QueuedTreeRegistration>> listPending() async {
    await init();
    final rows = await _db!.query(
      'tree_queue',
      where: 'status IN (?, ?)',
      whereArgs: [TreeQueueStatus.pending.index, TreeQueueStatus.failed.index],
      orderBy: 'created_at ASC',
    );
    return rows.map(QueuedTreeRegistration.fromMap).toList();
  }

  Future<int> pendingCount() async {
    final items = await listPending();
    return items.length;
  }

  Future<void> updateStatus(
    String id, {
    required TreeQueueStatus status,
    String? errorMessage,
    int? retryCount,
  }) async {
    await init();
    await _db!.update(
      'tree_queue',
      {
        'status': status.index,
        'error_message': errorMessage,
        if (retryCount != null) 'retry_count': retryCount,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    notifyListeners();
  }

  Future<void> remove(String id) async {
    await init();
    await _db!.delete('tree_queue', where: 'id = ?', whereArgs: [id]);
    notifyListeners();
  }
}
