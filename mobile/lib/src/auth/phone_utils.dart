/// Indian mobile helpers — mirrors web `lib/phone.ts`.

String sanitizePhoneDigits(String raw) {
  return raw.replaceAll(RegExp(r'\D'), '');
}

bool isValidIndianMobile(String digits) {
  final d = sanitizePhoneDigits(digits);
  if (d.length != 10) return false;
  return RegExp(r'^[6-9]').hasMatch(d);
}

String phoneForApi(String digits) {
  final d = sanitizePhoneDigits(digits);
  if (d.length == 10) return '+91$d';
  if (d.startsWith('91') && d.length == 12) return '+$d';
  return d.startsWith('+') ? d : '+$d';
}

String formatPhoneDisplay(String digits) {
  final d = sanitizePhoneDigits(digits);
  if (d.length <= 5) return d;
  if (d.length <= 10) {
    return '${d.substring(0, 5)} ${d.substring(5)}';
  }
  return d;
}
