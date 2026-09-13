import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/api/upload_mime.dart';

void main() {
  test('mimeTypeForUploadPath detects common image formats', () {
    expect(mimeTypeForUploadPath('/tmp/photo.jpg'), 'image/jpeg');
    expect(mimeTypeForUploadPath('/tmp/photo.JPEG'), 'image/jpeg');
    expect(mimeTypeForUploadPath('/tmp/photo.png'), 'image/png');
    expect(mimeTypeForUploadPath('/tmp/photo.webp'), 'image/webp');
  });

  test('mimeTypeForUploadPath detects audio formats', () {
    expect(mimeTypeForUploadPath('/data/byot_bio_1.wav'), 'audio/wav');
    expect(mimeTypeForUploadPath('/data/recording.m4a'), 'audio/mp4');
  });

  test('mimeTypeForUploadPath returns null for unknown extensions', () {
    expect(mimeTypeForUploadPath('/tmp/file.bin'), isNull);
    expect(mimeTypeForUploadPath('/tmp/noext'), isNull);
  });
}
