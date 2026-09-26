import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:asn1lib/asn1lib.dart';
import 'package:crypto/crypto.dart';

/// SHA-256 SPKI pin (base64) from an X.509 certificate DER encoding.
String spkiSha256PinFromDer(Uint8List der) {
  final parser = ASN1Parser(der);
  final certificate = parser.nextObject() as ASN1Sequence;
  final tbs = certificate.elements!.first as ASN1Sequence;
  final spki = _subjectPublicKeyInfo(tbs);
  final digest = sha256.convert(spki.encodedBytes);
  return base64.encode(digest.bytes);
}

String spkiSha256PinFromCertificate(X509Certificate certificate) {
  return spkiSha256PinFromDer(certificate.der);
}

ASN1Sequence _subjectPublicKeyInfo(ASN1Sequence tbsCertificate) {
  final elements = tbsCertificate.elements!;
  if (elements.isEmpty) {
    throw const FormatException('empty TBSCertificate');
  }
  final first = elements.first;
  // Version [0] EXPLICIT — SPKI at index 6; v1 certs — SPKI at index 5.
  if (first is ASN1Object && first.tag == 0xA0) {
    return elements[6] as ASN1Sequence;
  }
  return elements[5] as ASN1Sequence;
}

bool certificateMatchesAnyPin(X509Certificate certificate, Set<String> allowedPins) {
  if (allowedPins.isEmpty) return false;
  try {
    final pin = spkiSha256PinFromCertificate(certificate);
    return allowedPins.contains(pin);
  } catch (_) {
    return false;
  }
}
