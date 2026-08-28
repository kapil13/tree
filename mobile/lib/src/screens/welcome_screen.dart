import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/l10n_ext.dart';
import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/brand_mark.dart';

/// Marketing-first entry — brand hero, visual journey, clear CTAs.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _motion;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;
  final _page = PageController(viewportFraction: 0.86);
  int _pageIndex = 0;

  List<_JourneyStep> _journeySteps(BuildContext context) {
    final l10n = context.l10n;
    return [
      _JourneyStep(
        icon: Icons.pin_drop_rounded,
        title: l10n.registerTreePrimary,
        line: l10n.registerTreePrimarySub,
        accent: const Color(0xFF1B8A4C),
        soft: const Color(0xFFE8F5EC),
      ),
      _JourneyStep(
        icon: Icons.satellite_alt_rounded,
        title: l10n.homeForestHealth,
        line: l10n.navSectionIntelligenceDesc,
        accent: const Color(0xFF0E7490),
        soft: const Color(0xFFE0F2FE),
      ),
      _JourneyStep(
        icon: Icons.insights_rounded,
        title: l10n.navSectionReports,
        line: l10n.navSectionReportsDesc,
        accent: const Color(0xFF166534),
        soft: const Color(0xFFECFDF3),
      ),
    ];
  }

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
    _page.dispose();
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final journey = _journeySteps(context);
    return AuthLightScope(
      child: Scaffold(
        backgroundColor: AranyixColors.surface,
        body: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slide,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _HeroCard(),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        Text(
                          l10n.yourJourney,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: AranyixColors.forestDark,
                              ),
                        ),
                        const Spacer(),
                        Text(
                          '${_pageIndex + 1}/${journey.length}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AranyixColors.onSurfaceMuted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.welcomeJourneySub,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AranyixColors.onSurfaceMuted,
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      height: 196,
                      child: PageView.builder(
                        controller: _page,
                        itemCount: journey.length,
                        onPageChanged: (i) => setState(() => _pageIndex = i),
                        itemBuilder: (context, index) {
                          return Padding(
                            padding: EdgeInsets.only(
                              right: index == journey.length - 1 ? 0 : 12,
                            ),
                            child: _JourneyCard(
                              step: journey[index],
                              number: index + 1,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(journey.length, (i) {
                        final active = i == _pageIndex;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: active ? 18 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: active
                                ? AranyixColors.forest
                                : AranyixColors.borderStrong,
                            borderRadius: BorderRadius.circular(99),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 28),
                    FilledButton(
                      onPressed: () => context.push('/signup'),
                      child: Text(l10n.createFreeAccount),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: () => context.go('/login'),
                      child: Text(l10n.alreadyHaveAccountBtn),
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

class _HeroCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(22, 22, 22, 22),
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
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const AranyixBrandMark(size: 46, radius: 13),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'India-first MRV',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.92),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            context.l10n.appTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
              height: 1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.l10n.welcomeTitle,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.92),
              fontSize: 15,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _JourneyStep {
  const _JourneyStep({
    required this.icon,
    required this.title,
    required this.line,
    required this.accent,
    required this.soft,
  });

  final IconData icon;
  final String title;
  final String line;
  final Color accent;
  final Color soft;
}

class _JourneyCard extends StatelessWidget {
  const _JourneyCard({required this.step, required this.number});

  final _JourneyStep step;
  final int number;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: AranyixColors.border),
        boxShadow: AranyixShadows.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    step.soft,
                    step.soft.withValues(alpha: 0.35),
                    Colors.white,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -18,
                    top: -12,
                    child: Icon(
                      step.icon,
                      size: 110,
                      color: step.accent.withValues(alpha: 0.12),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    top: 14,
                    child: Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: step.accent,
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: Text(
                        '$number',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: step.accent.withValues(alpha: 0.16),
                            blurRadius: 18,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Icon(step.icon, color: step.accent, size: 34),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AranyixColors.onSurface,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  step.line,
                  style: const TextStyle(
                    fontSize: 13,
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
