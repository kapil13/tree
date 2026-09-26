import 'package:byot_mobile/src/project_setup_readiness.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('blocks tree registration when tree defaults missing', () {
    final status = evaluateProjectSetup({
      'scheme_code': 'nhai',
      'program_code': 'government_nhai',
      'compliance_mode': 'guided',
      'active_standard': {'name': 'NHAI'},
      'metadata': {'tree_registration_defaults': {}},
    }, []);

    expect(status.canRegisterTree, isFalse);
    expect(status.blockReason, contains('defaults'));
    expect(status.steps.any((s) => s.id == 'tree_defaults' && !s.complete), isTrue);
  });

  test('blocks when scheme refs missing', () {
    final status = evaluateProjectSetup(
      {
        'scheme_code': 'nhai',
        'program_code': 'government_nhai',
        'compliance_mode': 'guided',
        'active_standard': {'name': 'NHAI'},
        'metadata': {
          'tree_registration_defaults': {
            'permit_reference': 'PCA-1',
            'site_zone': 'Zone A',
            'implementing_agency': 'NHAI',
            'maintenance_responsible': 'Contractor',
          },
        },
      },
      [
        {'id': 'wa-1', 'name': 'Package 1'},
      ],
      scheme: {
        'metadata_sections': [
          {
            'fields': [
              {'key': 'nhai_package', 'required': true},
            ],
          },
        ],
      },
    );

    expect(status.canRegisterTree, isFalse);
    expect(status.steps.any((s) => s.id == 'scheme_refs' && !s.complete), isTrue);
  });

  test('allows registration when defaults and work area exist', () {
    final status = evaluateProjectSetup(
      {
        'scheme_code': 'nhai',
        'program_code': 'government_nhai',
        'compliance_mode': 'guided',
        'active_standard': {'name': 'NHAI'},
        'metadata': {
          'tree_registration_defaults': {
            'permit_reference': 'PCA-1',
            'site_zone': 'Zone A',
            'implementing_agency': 'NHAI',
            'maintenance_responsible': 'Contractor',
          },
          'scheme_refs': {'nhai_package': 'PKG-1'},
        },
      },
      [
        {'id': 'wa-1', 'name': 'Package 1'},
      ],
      scheme: {
        'metadata_sections': [
          {
            'fields': [
              {'key': 'nhai_package', 'required': true},
            ],
          },
        ],
      },
    );

    expect(status.canRegisterTree, isTrue);
  });
}
