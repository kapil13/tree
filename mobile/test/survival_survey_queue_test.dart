import 'package:byot_mobile/src/offline/survival_survey_queue.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('QueuedSurvivalSurvey round-trips payload and photo paths', () {
    final item = QueuedSurvivalSurvey(
      id: 'survival-tree-1-1',
      payloadJson:
          '{"tree_id":"tree-1","latitude":12.34,"longitude":56.78,"survival_status":"live"}',
      localPhotoPaths: '/tmp/survey.jpg',
      createdAt: DateTime.utc(2026, 9, 13),
      status: SurvivalSurveyQueueStatus.pending,
    );

    final map = item.toMap();
    final restored = QueuedSurvivalSurvey.fromMap(map);

    expect(restored.id, item.id);
    expect(restored.payload['tree_id'], 'tree-1');
    expect(restored.photoPaths, ['/tmp/survey.jpg']);
    expect(restored.status, SurvivalSurveyQueueStatus.pending);
  });

  test('copyWith updates queue status fields', () {
    final item = QueuedSurvivalSurvey(
      id: 'survival-tree-2-1',
      payloadJson: '{"tree_id":"tree-2"}',
      localPhotoPaths: '',
      createdAt: DateTime.utc(2026, 9, 13),
      status: SurvivalSurveyQueueStatus.pending,
    );

    final failed = item.copyWith(
      status: SurvivalSurveyQueueStatus.failed,
      errorMessage: 'network',
      retryCount: 1,
    );

    expect(failed.status, SurvivalSurveyQueueStatus.failed);
    expect(failed.errorMessage, 'network');
    expect(failed.retryCount, 1);
  });
}
