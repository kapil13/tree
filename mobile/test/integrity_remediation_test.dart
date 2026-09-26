import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';

import 'package:byot_mobile/src/integrity_remediation.dart';

void main() {
  test('integrityBlockerLabel maps known codes', () async {
    final l10n = await AppLocalizations.delegate.load(const Locale('en'));
    expect(integrityBlockerLabel(l10n, 'insufficient_photos'), 'Need at least 2 photos');
    expect(integrityBlockerLabel(l10n, 'unknown_code'), 'unknown code');
  });

  test('resolveIntegrityRemediation returns survival route for regeotag', () async {
    final l10n = await AppLocalizations.delegate.load(const Locale('en'));
    final action = resolveIntegrityRemediation(l10n, 'regeotag_mismatch', treeId: 'tree-1');
    expect(action.route, '/trees/tree-1/survival');
    expect(action.label, contains('Re-geotag'));
  });

  test('resolveIntegrityRemediation returns project route for SAR issues', () async {
    final l10n = await AppLocalizations.delegate.load(const Locale('en'));
    final action = resolveIntegrityRemediation(l10n, 'sar_integrity_below_minimum', projectId: 'proj-1');
    expect(action.route, '/projects/proj-1');
  });
}
