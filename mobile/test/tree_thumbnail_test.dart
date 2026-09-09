import 'package:byot_mobile/src/tree_thumbnail.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('treeListThumbnailUrl prefers primary_image_url', () {
    final url = treeListThumbnailUrl({
      'primary_image_url': 'https://cdn.example/primary.jpg',
      'images': [
        {'cdn_url': 'https://cdn.example/other.jpg'},
      ],
    });
    expect(url, 'https://cdn.example/primary.jpg');
  });

  test('treeListThumbnailUrl falls back to primary image in images list', () {
    final url = treeListThumbnailUrl({
      'images': [
        {'cdn_url': 'https://cdn.example/a.jpg'},
        {'cdn_url': 'https://cdn.example/b.jpg', 'is_primary': true},
      ],
    });
    expect(url, 'https://cdn.example/b.jpg');
  });
}
