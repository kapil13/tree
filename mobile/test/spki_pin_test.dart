import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/services/certificate_pinning.dart';
import 'package:byot_mobile/src/services/spki_pin.dart';

void main() {
  group('spki_pin', () {
    late Uint8List leafDer;

    setUp(() {
      final fixture = File('test/fixtures/api_aranyix_leaf.der');
      leafDer = fixture.readAsBytesSync();
    });

    test('computes expected SPKI pin for api.aranyix.tech leaf cert', () {
      final pin = spkiSha256PinFromDer(leafDer);
      expect(pin, '+w3nshcsLZg8wF9HanIqtlRHbMCpKRCITuzlQ3QUwoE=');
      expect(CertificatePinning.productionPins, contains(pin));
    });

    test('certificateMatchesAnyPin accepts production pin set', () {
      final cert = _FakeCertificate(leafDer);
      expect(
        certificateMatchesAnyPin(cert, CertificatePinning.productionPins),
        isTrue,
      );
    });

    test('certificateMatchesAnyPin rejects empty or wrong pins', () {
      final cert = _FakeCertificate(leafDer);
      expect(certificateMatchesAnyPin(cert, const {}), isFalse);
      expect(
        certificateMatchesAnyPin(cert, const {'invalid-pin-base64='}),
        isFalse,
      );
    });
  });
}

/// Minimal [X509Certificate] stub — pinning only reads [der].
class _FakeCertificate implements X509Certificate {
  _FakeCertificate(this.der);

  @override
  final Uint8List der;

  @override
  String get pem => throw UnimplementedError();

  @override
  Uint8List get sha1 => throw UnimplementedError();

  @override
  String get subject => throw UnimplementedError();

  @override
  String get issuer => throw UnimplementedError();

  @override
  DateTime get startValidity => throw UnimplementedError();

  @override
  DateTime get endValidity => throw UnimplementedError();
}
