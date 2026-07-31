import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';

/// Marketing-first entry — explains value before sign-up or sign-in.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  static const _features = [
    _Feature(
      emoji: '📍',
      title: 'Register trees in the field',
      body: 'GPS, photos, and offline sync — even with patchy connectivity.',
    ),
    _Feature(
      emoji: '🛰️',
      title: 'Satellite & AI health',
      body: 'NDVI trends, alerts, and an assistant that speaks your language.',
    ),
    _Feature(
      emoji: '📊',
      title: 'Executive dashboard',
      body: 'Carbon, biodiversity, and compliance — one calm view.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(24, 36, 24, 32),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF041F17), AranyixColors.forest],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(AranyixRadii.card),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('🌳', style: TextStyle(fontSize: 48)),
                          const SizedBox(height: 12),
                          const Text(
                            'Aranyix',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Data · Intelligence · Nature · Future',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.85),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'India-first plantation intelligence for citizens, governments, and enterprises.',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 16,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text('Your journey', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 16),
                    for (var i = 0; i < _features.length; i++) ...[
                      _FeatureTile(feature: _features[i], step: i + 1),
                      if (i < _features.length - 1) const SizedBox(height: 12),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  FilledButton(
                    onPressed: () => context.push('/signup'),
                    child: const Text('Create free account'),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: () => context.push('/login'),
                    child: const Text('I already have an account'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Feature {
  const _Feature({required this.emoji, required this.title, required this.body});
  final String emoji;
  final String title;
  final String body;
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({required this.feature, required this.step});

  final _Feature feature;
  final int step;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AranyixColors.forestLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(feature.emoji, style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${step}. ${feature.title}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  feature.body,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
