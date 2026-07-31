import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/auth/onboarding_routing.dart';
import 'package:byot_mobile/src/auth/phone_utils.dart';

void main() {
  group('phone_utils', () {
    test('validates Indian mobile', () {
      expect(isValidIndianMobile('9876543210'), isTrue);
      expect(isValidIndianMobile('5876543210'), isFalse);
      expect(isValidIndianMobile('98765'), isFalse);
    });

    test('formats phone for API', () {
      expect(phoneForApi('9876543210'), '+919876543210');
    });
  });

  group('onboarding_routing', () {
    test('pending approval redirects', () {
      expect(
        onboardingRedirectPath({'onboarding_status': 'pending_approval'}),
        '/onboarding/pending',
      );
    });

    test('BYOT post-signup lands on register tree when no programs', () {
      expect(
        postSignupLandingRoute({'onboarding_status': 'active_byot', 'enrolled_program_codes': []}),
        '/trees/new',
      );
    });
  });
}
