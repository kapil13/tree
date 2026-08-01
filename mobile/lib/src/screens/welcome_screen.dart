import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/brand_mark.dart';

/// Marketing-first entry — brand-first, journey-clear, CTA-focused.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _motion;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  static const _features = [
    _Feature(
      icon: Icons.pin_drop_outlined,
      title: 'Register trees in the field',
      body: 'GPS, photos, and offline sync — even with patchy connectivity.',
    ),
    _Feature(
      icon: Icons.satellite_alt_outlined,
      title: 'Satellite & AI health',
      body: 'NDVI trends, alerts, and an assistant that speaks your language.',
    ),
    _Feature(
      icon: Icons.insights_outlined,
      title: 'Executive dashboard',
      body: 'Carbon, biodiversity, and compliance — one calm view.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _motion = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fade = CurvedAnimation(parent: _motion, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero)
        .animate(CurvedAnimation(parent: _motion, curve: Curves.easeOutCubic));
    _motion.forward();
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthLightScope(
      child: Scaffold(
        backgroundColor: AranyixColors.surface,
        body: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slide,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.fromLTRB(24, 28, 24, 26),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [
                                  AranyixColors.heroGradientStart,
                                  AranyixColors.heroGradientEnd,
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(AranyixRadii.card),
                              boxShadow: AranyixShadows.soft,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(3),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.14),
                                        borderRadius: BorderRadius.circular(18),
                                      ),
                                      child: const AranyixBrandMark(size: 52, radius: 15),
                                    ),
                                    const Spacer(),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        'India-first MRV',
                                        style: TextStyle(
                                          color: Colors.white.withValues(alpha: 0.92),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 22),
                                const Text(
                                  'Aranyix',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 40,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -1.1,
                                    height: 1,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Data · Intelligence · Nature · Future',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.88),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  'Plantation intelligence for citizens, governments, and enterprises — from field GPS to audit-ready evidence.',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.92),
                                    fontSize: 16,
                                    height: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 28),
                          Text(
                            'Your journey',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: AranyixColors.forestDark,
                                ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Three steps from field capture to executive clarity.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
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
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
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
          ),
        ),
      ),
    );
  }
}

class _Feature {
  const _Feature({required this.icon, required this.title, required this.body});
  final IconData icon;
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: AranyixColors.border),
        boxShadow: AranyixShadows.card,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AranyixColors.forestLight,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(feature.icon, color: AranyixColors.forest, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$step. ${feature.title}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15.5,
                    color: AranyixColors.onSurface,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  feature.body,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.45,
                    color: AranyixColors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
