import 'package:flutter_test/flutter_test.dart';

/// Mirrors add-tree wizard back interception: step 0 pops, later steps decrement.
int wizardStepAfterSystemBack(int currentStep) {
  if (currentStep <= 0) return currentStep;
  return currentStep - 1;
}

bool canPopWizardRoute(int currentStep) => currentStep == 0;

void main() {
  test('wizard back from step 0 allows route pop', () {
    expect(canPopWizardRoute(0), isTrue);
    expect(wizardStepAfterSystemBack(0), 0);
  });

  test('wizard back from later steps decrements step', () {
    expect(canPopWizardRoute(2), isFalse);
    expect(wizardStepAfterSystemBack(2), 1);
    expect(wizardStepAfterSystemBack(4), 3);
  });
}
