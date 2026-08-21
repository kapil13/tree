import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../nav_access.dart';
import '../../theme.dart';

class QuickAction {
  const QuickAction({
    required this.label,
    required this.icon,
    required this.route,
    this.color,
    this.push = false,
  });

  final String label;
  final IconData icon;
  final String route;
  final Color? color;
  final bool push;
}

/// Horizontal quick-action chips for the home dashboard.
class DashboardQuickActions extends StatelessWidget {
  const DashboardQuickActions({super.key, required this.user});

  final Map<String, dynamic>? user;

  @override
  Widget build(BuildContext context) {
    final actions = <QuickAction>[
      const QuickAction(
        label: 'Register tree',
        icon: Icons.add_circle_outline,
        route: '/trees/new',
        color: AranyixColors.forest,
        push: true,
      ),
      const QuickAction(
        label: 'Map',
        icon: Icons.map_outlined,
        route: '/map',
      ),
      if (canSeeStewardship(user))
        const QuickAction(
          label: 'Stewardship',
          icon: Icons.favorite_outline,
          route: '/stewardship',
        ),
      if (canSeePortfolioHealth(user))
        const QuickAction(
          label: 'Portfolio',
          icon: Icons.insights_outlined,
          route: '/portfolio-health',
        ),
      if (canSeeBioacoustic(user))
        const QuickAction(
          label: 'Bioacoustic',
          icon: Icons.graphic_eq,
          route: '/bioacoustic',
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text('Quick actions', style: Theme.of(context).textTheme.titleMedium),
        ),
        SizedBox(
          height: 96,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: actions.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              final a = actions[i];
              return _ActionChip(
                action: a,
                onTap: () {
                  if (a.push) {
                    context.push(a.route);
                  } else {
                    context.go(a.route);
                  }
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({required this.action, required this.onTap});

  final QuickAction action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = action.color ?? AranyixColors.forestDark;
    return Material(
      color: AranyixColors.surfaceContainer,
      borderRadius: BorderRadius.circular(AranyixRadii.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Container(
          width: 100,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AranyixRadii.card),
            border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(action.icon, color: color, size: 26),
              Text(
                action.label,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
