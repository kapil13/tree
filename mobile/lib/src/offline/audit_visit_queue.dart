import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';

enum AuditVisitQueueStatus { pending, syncing, failed }

class QueuedAuditVisit {
  const QueuedAuditVisit({
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
  final AuditVisitQueueStatus status;
  final String? errorMessage;
  final int retryCount;

  Map<String, dynamic> get payload =>
      Map<String, dynamic>.from(jsonDecode(payloadJson) as Map);

  List<String> get photoPaths =>
      localPhotoPaths.isEmpty ? [] : localPhotoPaths.split('|');

  QueuedAuditVisit copyWith({
    AuditVisitQueueStatus? status,
    String? errorMessage,
    int? retryCount,
  }) {
    return QueuedAuditVisit(
      id: id,
      payloadJson: payloadJson,
      localPhotoPaths: localPhotoPaths,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  static QueuedAuditVisit fromMap(Map<String, Object?> row) {
    return QueuedAuditVisit(
      id: row['id'] as String,
      payloadJson: row['payload_json'] as String,
      localPhotoPaths: row['local_photo_paths'] as String? ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int),
      status: AuditVisitQueueStatus.values[row['status'] as int],
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

class AuditVisitQueue extends ChangeNotifier {
  Database? _db;

  Future<void> init() async {
    _db ??= await openDatabase(
      'audit_visit_queue.db',
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE audit_visit_queue (
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
    await _db!.insert('audit_visit_queue', {
      'id': id,
      'payload_json': jsonEncode(payload),
      'local_photo_paths': localPhotoPaths.join('|'),
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'status': AuditVisitQueueStatus.pending.index,
      'retry_count': 0,
    });
    notifyListeners();
  }

  Future<List<QueuedAuditVisit>> listAll() async {
    await init();
    final rows = await _db!.query('audit_visit_queue', orderBy: 'created_at DESC');
    return rows.map(QueuedAuditVisit.fromMap).toList();
  }

  Future<List<QueuedAuditVisit>> listPending() async {
    await init();
    final rows = await _db!.query(
      'audit_visit_queue',
      where: 'status IN (?, ?)',
      whereArgs: [
        AuditVisitQueueStatus.pending.index,
        AuditVisitQueueStatus.failed.index,
      ],
      orderBy: 'created_at ASC',
    );
    return rows.map(QueuedAuditVisit.fromMap).toList();
  }

  Future<int> pendingCount() async {
    final items = await listPending();
    return items.length;
  }

  Future<void> updateStatus(
    String id, {
    required AuditVisitQueueStatus status,
    String? errorMessage,
    int? retryCount,
  }) async {
    await init();
    await _db!.update(
      'audit_visit_queue',
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

  Future<void> markPending(String id) async {
    await init();
    await _db!.update(
      'audit_visit_queue',
      {'status': AuditVisitQueueStatus.pending.index, 'error_message': null},
      where: 'id = ?',
      whereArgs: [id],
    );
    notifyListeners();
  }

  Future<void> remove(String id) async {
    await init();
    final rows = await _db!.query(
      'audit_visit_queue',
      columns: ['local_photo_paths'],
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (rows.isNotEmpty) {
      final paths = (rows.first['local_photo_paths'] as String? ?? '').split('|');
      for (final path in paths) {
        if (path.isEmpty) continue;
        final file = File(path);
        if (await file.exists()) {
          await file.delete();
        }
      }
    }
    await _db!.delete('audit_visit_queue', where: 'id = ?', whereArgs: [id]);
    notifyListeners();
  }
}
