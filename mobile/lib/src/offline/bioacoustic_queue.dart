import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

enum BioacousticQueueStatus { pending, syncing, failed }

class QueuedBioacousticRecording {
  const QueuedBioacousticRecording({
    required this.id,
    required this.filePath,
    required this.durationSeconds,
    required this.latitude,
    required this.longitude,
    required this.createdAt,
    required this.status,
    this.errorMessage,
    this.retryCount = 0,
  });

  final String id;
  final String filePath;
  final double durationSeconds;
  final double latitude;
  final double longitude;
  final DateTime createdAt;
  final BioacousticQueueStatus status;
  final String? errorMessage;
  final int retryCount;

  QueuedBioacousticRecording copyWith({
    BioacousticQueueStatus? status,
    String? errorMessage,
    int? retryCount,
  }) {
    return QueuedBioacousticRecording(
      id: id,
      filePath: filePath,
      durationSeconds: durationSeconds,
      latitude: latitude,
      longitude: longitude,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  static QueuedBioacousticRecording fromMap(Map<String, Object?> row) {
    return QueuedBioacousticRecording(
      id: row['id'] as String,
      filePath: row['file_path'] as String,
      durationSeconds: (row['duration_seconds'] as num).toDouble(),
      latitude: (row['latitude'] as num).toDouble(),
      longitude: (row['longitude'] as num).toDouble(),
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int),
      status: BioacousticQueueStatus.values[row['status'] as int],
      errorMessage: row['error_message'] as String?,
      retryCount: row['retry_count'] as int? ?? 0,
    );
  }

  Map<String, Object?> toMap() => {
        'id': id,
        'file_path': filePath,
        'duration_seconds': durationSeconds,
        'latitude': latitude,
        'longitude': longitude,
        'created_at': createdAt.millisecondsSinceEpoch,
        'status': status.index,
        'error_message': errorMessage,
        'retry_count': retryCount,
      };
}

/// Persists bioacoustic recordings locally until they can be uploaded.
class BioacousticQueue extends ChangeNotifier {
  Database? _db;

  Future<void> init() async {
    if (_db != null) return;
    final dir = await getApplicationDocumentsDirectory();
    final path = p.join(dir.path, 'bioacoustic_queue.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE bioacoustic_queue (
            id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL,
            duration_seconds REAL NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            created_at INTEGER NOT NULL,
            status INTEGER NOT NULL,
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
    );
  }

  Future<Database> _database() async {
    await init();
    return _db!;
  }

  Future<String> _queueAudioDir() async {
    final dir = await getApplicationDocumentsDirectory();
    final audioDir = Directory(p.join(dir.path, 'bioacoustic_queue'));
    if (!await audioDir.exists()) {
      await audioDir.create(recursive: true);
    }
    return audioDir.path;
  }

  /// Copy recording from temp storage into app documents and enqueue it.
  Future<QueuedBioacousticRecording> enqueue({
    required String tempFilePath,
    required double durationSeconds,
    required double latitude,
    required double longitude,
  }) async {
    final db = await _database();
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final destPath = p.join(await _queueAudioDir(), '$id.m4a');
    await File(tempFilePath).copy(destPath);

    final item = QueuedBioacousticRecording(
      id: id,
      filePath: destPath,
      durationSeconds: durationSeconds,
      latitude: latitude,
      longitude: longitude,
      createdAt: DateTime.now(),
      status: BioacousticQueueStatus.pending,
    );
    await db.insert('bioacoustic_queue', item.toMap());
    notifyListeners();
    return item;
  }

  Future<List<QueuedBioacousticRecording>> listAll() async {
    final db = await _database();
    final rows = await db.query(
      'bioacoustic_queue',
      orderBy: 'created_at DESC',
    );
    return rows.map(QueuedBioacousticRecording.fromMap).toList();
  }

  Future<List<QueuedBioacousticRecording>> listPending() async {
    final db = await _database();
    final rows = await db.query(
      'bioacoustic_queue',
      where: 'status IN (?, ?)',
      whereArgs: [
        BioacousticQueueStatus.pending.index,
        BioacousticQueueStatus.failed.index,
      ],
      orderBy: 'created_at ASC',
    );
    return rows.map(QueuedBioacousticRecording.fromMap).toList();
  }

  Future<int> pendingCount() async {
    final db = await _database();
    final result = await db.rawQuery(
      'SELECT COUNT(*) AS c FROM bioacoustic_queue WHERE status IN (?, ?)',
      [
        BioacousticQueueStatus.pending.index,
        BioacousticQueueStatus.failed.index,
      ],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  Future<void> markSyncing(String id) async {
    final db = await _database();
    await db.update(
      'bioacoustic_queue',
      {'status': BioacousticQueueStatus.syncing.index, 'error_message': null},
      where: 'id = ?',
      whereArgs: [id],
    );
    notifyListeners();
  }

  Future<void> markFailed(String id, String error) async {
    final db = await _database();
    final rows = await db.query(
      'bioacoustic_queue',
      columns: ['retry_count'],
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    final retries = (rows.first['retry_count'] as int? ?? 0) + 1;
    await db.update(
      'bioacoustic_queue',
      {
        'status': BioacousticQueueStatus.failed.index,
        'error_message': error,
        'retry_count': retries,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    notifyListeners();
  }

  Future<void> markPending(String id) async {
    final db = await _database();
    await db.update(
      'bioacoustic_queue',
      {
        'status': BioacousticQueueStatus.pending.index,
        'error_message': null,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    notifyListeners();
  }

  Future<void> remove(String id) async {
    final db = await _database();
    final rows = await db.query(
      'bioacoustic_queue',
      columns: ['file_path'],
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (rows.isNotEmpty) {
      final filePath = rows.first['file_path'] as String;
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
      }
    }
    await db.delete('bioacoustic_queue', where: 'id = ?', whereArgs: [id]);
    notifyListeners();
  }

  @override
  void dispose() {
    _db?.close();
    super.dispose();
  }
}
