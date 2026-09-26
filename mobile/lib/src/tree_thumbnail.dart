/// Resolve a list-row thumbnail URL from a tree list API payload.
String? treeListThumbnailUrl(Map<String, dynamic> tree) {
  final primary = tree['primary_image_url'] as String?;
  if (primary != null && primary.isNotEmpty) return primary;
  final thumb = tree['thumbnail_url'] as String?;
  if (thumb != null && thumb.isNotEmpty) return thumb;
  final images = tree['images'] as List?;
  if (images == null || images.isEmpty) return null;
  for (final raw in images) {
    if (raw is! Map) continue;
    final url = raw['cdn_url'] as String? ?? raw['url'] as String?;
    if (url != null && url.isNotEmpty) {
      if (raw['is_primary'] == true) return url;
    }
  }
  final first = images.first;
  if (first is Map) {
    return first['cdn_url'] as String? ?? first['url'] as String?;
  }
  return null;
}
