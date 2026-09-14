import 'package:flutter_test/flutter_test.dart';

bool stewardshipTreeDue(Map<String, dynamic> tree) => tree['next_checkin_due'] == true;

void main() {
  test('stewardshipTreeDue reads next_checkin_due flag', () {
    expect(stewardshipTreeDue({'next_checkin_due': true}), isTrue);
    expect(stewardshipTreeDue({'next_checkin_due': false}), isFalse);
  });

  test('stewardship payload splits owned and adopted lists', () {
    final payload = {
      'owned': [
        {'id': 'a', 'species_text': 'Neem', 'next_checkin_due': true},
      ],
      'adopted': [
        {'id': 'b', 'species_text': 'Peepal', 'next_checkin_due': false},
      ],
      'due_count': 1,
    };
    final owned = List<Map<String, dynamic>>.from(payload['owned'] as List);
    final adopted = List<Map<String, dynamic>>.from(payload['adopted'] as List);
    expect(owned.length, 1);
    expect(adopted.length, 1);
    expect(payload['due_count'], 1);
    expect(owned.where(stewardshipTreeDue).length, 1);
  });
}
