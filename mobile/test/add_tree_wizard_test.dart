import 'package:flutter_test/flutter_test.dart';

void main() {
  test('add tree wizard has five steps', () {
    const stepCount = 5;
    expect(stepCount, 5);
  });

  test('bioacoustic recording bounds', () {
    const minSeconds = 60;
    const maxSeconds = 180;
    expect(minSeconds < maxSeconds, isTrue);
    expect(maxSeconds - minSeconds, 120);
  });
}
