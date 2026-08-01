import 'package:flutter/material.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/brand_mark.dart';

/// Marketing entry — brand first, light journey strip, clear CTAs.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _motion;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _motion = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fade = CurvedAnimation(parent: _motion, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.03), end: Offset.zero)
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
    final l10n = AppLocalizations.of(context);

    return AuthLightScope(
      child: Scaffold(
        backgroundColor: AranyixColors.surface,
        body: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slide,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
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
                                const AranyixBrandMark(size: 48, radius: 14),
                                const SizedBox(height: 18),
                                Text(
                                  l10n?.appTitle ?? 'Aranyix',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 34,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.8,
                                    height: 1,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  l10n?.welcomeSubtitle ??
                                      'Plantation intelligence — field to audit-ready evidence.',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.92),
                                    fontSize: 15,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 22),
                          Text(
                            l10n?.yourJourney ?? 'Your journey',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: AranyixColors.forestDark,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _JourneyStep(
                                  number: 1,
                                  title: l10n?.journeyCapture ?? 'Capture',
                                  line: l10n?.journeyCaptureLine ?? 'GPS · photos · offline',
                                  icon: Icons.pin_drop_rounded,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _JourneyStep(
                                  number: 2,
                                  title: l10n?.journeyMonitor ?? 'Monitor',
                                  line: l10n?.journeyMonitorLine ?? 'NDVI · AI alerts',
                                  icon: Icons.satellite_alt_rounded,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _JourneyStep(
                                  number: 3,
                                  title: l10n?.journeyReport ?? 'Report',
                                  line: l10n?.journeyReportLine ?? 'Carbon · audit pack',
                                  icon: Icons.insights_rounded,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
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
          ),
        ),
      ),
    );
  }
}

class _JourneyStep extends StatelessWidget {
  const _JourneyStep({
    required this.number,
    required this.title,
    required this.line,
    required this.icon,
  });

  final int number;
  final String title;
  final String line;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 12, 10, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AranyixColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AranyixColors.forestLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 18, color: AranyixColors.forest),
          ),
          const SizedBox(height: 8),
          Text(
            '$number. $title',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12.5,
              color: AranyixColors.onSurface,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            line,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10.5, color: AranyixColors.onSurfaceMuted, height: 1.25),
          ),
        ],
      ),
    );
  }
}
