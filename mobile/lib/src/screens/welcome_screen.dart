import 'package:flutter/material.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/brand_mark.dart';

/// Post-splash entry — brand-first hero, quiet journey line, clear CTAs.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _motion;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;
  late final Animation<double> _heroScale;

  @override
  void initState() {
    super.initState();
    _motion = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fade = CurvedAnimation(parent: _motion, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero)
        .animate(CurvedAnimation(parent: _motion, curve: Curves.easeOutCubic));
    _heroScale = Tween<double>(begin: 0.98, end: 1).animate(
      CurvedAnimation(parent: _motion, curve: Curves.easeOutCubic),
    );
    _motion.forward();
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return AuthLightScope(
      child: Scaffold(
        backgroundColor: AranyixColors.surface,
        body: FadeTransition(
          opacity: _fade,
          child: SlideTransition(
            position: _slide,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: ScaleTransition(
                    scale: _heroScale,
                    child: Container(
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AranyixColors.heroGradientStart,
                            AranyixColors.heroGradientEnd,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(28, 36, 28, 32),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const AranyixBrandMark(size: 56, radius: 16, showGlow: true),
                              const Spacer(),
                              Text(
                                l10n?.appTitle ?? 'Aranyix',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 44,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -1.2,
                                  height: 1,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                l10n?.welcomeSubtitle ??
                                    'Plantation intelligence — field to audit-ready evidence.',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.92),
                                  fontSize: 16.5,
                                  height: 1.4,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 22, 24, 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          l10n?.yourJourney ?? 'Your journey',
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                color: AranyixColors.onSurfaceMuted,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.2,
                              ),
                        ),
                        const SizedBox(height: 10),
                        _JourneyLine(
                          steps: [
                            (
                              l10n?.journeyCapture ?? 'Capture',
                              l10n?.journeyCaptureLine ?? 'GPS · photos · offline',
                            ),
                            (
                              l10n?.journeyMonitor ?? 'Monitor',
                              l10n?.journeyMonitorLine ?? 'NDVI · AI alerts',
                            ),
                            (
                              l10n?.journeyReport ?? 'Report',
                              l10n?.journeyReportLine ?? 'Carbon · audit pack',
                            ),
                          ],
                        ),
                        const SizedBox(height: 22),
                        FilledButton(
                          onPressed: () => context.push('/signup'),
                          child: Text(l10n?.createFreeAccount ?? 'Create free account'),
                        ),
                        const SizedBox(height: 10),
                        OutlinedButton(
                          onPressed: () => context.push('/login'),
                          child: Text(l10n?.alreadyHaveAccount ?? 'I already have an account'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _JourneyLine extends StatelessWidget {
  const _JourneyLine({required this.steps});

  final List<(String, String)> steps;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              SizedBox(
                width: 22,
                child: Text(
                  '${i + 1}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: AranyixColors.forest,
                  ),
                ),
              ),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.35,
                      color: AranyixColors.onSurface,
                    ),
                    children: [
                      TextSpan(
                        text: steps[i].$1,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      TextSpan(
                        text: '  ·  ${steps[i].$2}',
                        style: const TextStyle(color: AranyixColors.onSurfaceMuted),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
