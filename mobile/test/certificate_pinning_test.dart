import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/services/certificate_pinning.dart';

void main() {
  test('productionPins is populated for release TLS pinning', () {
    expect(CertificatePinning.productionPins, isNotEmpty);
    expect(
      CertificatePinning.productionPins.every((pin) => pin.length >= 40),
      isTrue,
      reason: 'SPKI SHA-256 base64 pins should be non-trivial',
    );
  });
}
