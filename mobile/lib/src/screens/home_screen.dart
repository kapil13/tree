import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../dashboard/dashboard_brief.dart';
import '../providers.dart';
import '../theme.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final alertsAsync = ref.watch(alertsProvider);
    final weatherAsync = ref.watch(weatherProvider);
    final fencesAsync = ref.watch(plantationFencesProvider);
    final userAsync = ref.watch(userProvider);

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      body: SafeArea(
        child: RefreshIndicator(
          color: AranyixColors.forest,
          onRefresh: () async {
            ref.invalidate(dashboardProvider);
            ref.invalidate(alertsProvider);
            ref.invalidate(weatherProvider);
            ref.invalidate(plantationFencesProvider);
          },
          child: dashAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) {
              if (maybeRedirectUnauthorized(ref, context, e)) {
                return const Center(child: CircularProgressIndicator());
              }
              return _errorBody(context, ref, e);
            },
            data: (dashboard) {
              final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
              final weather = weatherAsync.maybeWhen(data: (d) => d, orElse: () => null);
              final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
              final user = userAsync.maybeWhen(data: (d) => d, orElse: () => null);

              final health = computeForestHealth(dashboard);
              final briefLines = buildAiBriefLines(
                dashboard: dashboard,
                alerts: alerts,
                weather: weather,
              );
              final priority = pickPriorityAlert(alerts);
              final metrics = buildQuickMetrics(dashboard: dashboard, weather: weather);

              return CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(
                    child: _DashboardTopBar(
                      projectName: _projectLabel(fences, user),
                      onNotifications: () => context.push('/notifications'),
                      onProfile: () => context.go('/profile'),
                      onProjectTap: () => _showProjectPicker(context, fences),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _ForestHealthHero(
                          score: health.score,
                          label: health.label,
                          trendDelta: health.trendDelta,
                          onViewDetails: () => context.push('/trees'),
                        ),
                        const SizedBox(height: 20),
                        _AiBriefCard(
                          lines: briefLines,
                          onReview: () => context.go('/assistant'),
                        ),
                        if (priority != null) ...[
                          const SizedBox(height: 20),
                          _PriorityAlertCard(
                            alert: priority,
                            onAction: () => context.push('/notifications'),
                          ),
                        ],
                        const SizedBox(height: 20),
                        _QuickSnapshotRow(metrics: metrics),
                        const SizedBox(height: 24),
                        _AskAranyixCard(
                          onTap: () => context.go('/assistant'),
                          onMic: () => context.go('/assistant'),
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.assignment_outlined),
                            title: const Text('Field projects'),
                            subtitle: const Text('NHAI packages, mine belts, society blocks'),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => context.push('/projects'),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _errorBody(BuildContext context, WidgetRef ref, Object e) {
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.5,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(apiErrorMessage(e), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => ref.invalidate(dashboardProvider),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _projectLabel(List<dynamic> fences, Map<String, dynamic>? user) {
    if (fences.isNotEmpty) {
      final first = fences.first as Map<String, dynamic>;
      final name = first['name'] as String? ?? 'Plantation';
      if (fences.length == 1) return name;
      return '$name +${fences.length - 1}';
    }
    return user?['full_name'] as String? ?? 'All sites';
  }

  void _showProjectPicker(BuildContext context, List<dynamic> fences) {
    if (fences.isEmpty) return;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AranyixColors.surfaceContainer,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AranyixRadii.card)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Text('Projects', style: Theme.of(ctx).textTheme.titleLarge),
            ),
            for (final raw in fences)
              ListTile(
                leading: const Icon(Icons.forest_outlined, color: AranyixColors.forest),
                title: Text((raw as Map<String, dynamic>)['name'] as String? ?? 'Site'),
                onTap: () => Navigator.pop(ctx),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _DashboardTopBar extends StatelessWidget {
  const _DashboardTopBar({
    required this.projectName,
    required this.onNotifications,
    required this.onProfile,
    required this.onProjectTap,
  });

  final String projectName;
  final VoidCallback onNotifications;
  final VoidCallback onProfile;
  final VoidCallback onProjectTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 4),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AranyixColors.heroGradientStart, AranyixColors.heroGradientEnd],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: const Text(
              'A',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
          ),
          const SizedBox(width: 10),
          const Text(
            'Aranyix',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              color: AranyixColors.forestDark,
            ),
          ),
          const Spacer(),
          TextButton.icon(
            onPressed: onProjectTap,
            icon: const Icon(Icons.expand_more, size: 18),
            label: Text(
              projectName,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
            style: TextButton.styleFrom(
              foregroundColor: AranyixColors.onSurfaceMuted,
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
          ),
          IconButton(
            onPressed: onNotifications,
            icon: const Icon(Icons.notifications_outlined),
            color: AranyixColors.forestDark,
          ),
          IconButton(
            onPressed: onProfile,
            icon: const CircleAvatar(
              radius: 14,
              backgroundColor: AranyixColors.forestLight,
              child: Icon(Icons.person, size: 16, color: AranyixColors.forest),
            ),
          ),
        ],
      ),
    );
  }
}

class _ForestHealthHero extends StatelessWidget {
  const _ForestHealthHero({
    required this.score,
    required this.label,
    required this.trendDelta,
    required this.onViewDetails,
  });

  final int score;
  final String label;
  final int trendDelta;
  final VoidCallback onViewDetails;

  @override
  Widget build(BuildContext context) {
    final trendText = trendDelta >= 0 ? '↑ +$trendDelta since yesterday' : '↓ $trendDelta since yesterday';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AranyixColors.heroGradientStart, AranyixColors.heroGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        boxShadow: [
          BoxShadow(
            color: AranyixColors.forest.withValues(alpha: 0.18),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Forest Health',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 14,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$score',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w300,
                    ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 10, left: 4),
                child: Text(
                  '/100',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 18,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Trend: $trendText',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.9),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: onViewDetails,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AranyixColors.forestDark,
              ),
              child: const Text('View Details'),
            ),
          ),
        ],
      ),
    );
  }
}

class _AiBriefCard extends StatelessWidget {
  const _AiBriefCard({required this.lines, required this.onReview});

  final List<String> lines;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AranyixColors.forestLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.auto_awesome, color: AranyixColors.forest, size: 20),
                ),
                const SizedBox(width: 12),
                Text("Today's AI Brief", style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            const SizedBox(height: 18),
            for (var i = 0; i < lines.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              Text(
                lines[i],
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(onPressed: onReview, child: const Text('Review Actions')),
            ),
          ],
        ),
      ),
    );
  }
}

class _PriorityAlertCard extends StatelessWidget {
  const _PriorityAlertCard({required this.alert, required this.onAction});

  final PriorityAlertView alert;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AranyixColors.warningContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: AranyixColors.warningBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🔥', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  alert.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AranyixColors.warningOnContainer,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            alert.zone,
            style: TextStyle(
              fontSize: 14,
              color: AranyixColors.warningOnContainer.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: onAction,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFEA580C),
              ),
              child: const Text('Take Action'),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickSnapshotRow extends StatelessWidget {
  const _QuickSnapshotRow({required this.metrics});

  final List<QuickMetric> metrics;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text('Quick Snapshot', style: Theme.of(context).textTheme.titleMedium),
        ),
        SizedBox(
          height: 108,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: metrics.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) => _MetricChip(metric: metrics[i]),
          ),
        ),
      ],
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.metric});

  final QuickMetric metric;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 108,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(metric.emoji, style: const TextStyle(fontSize: 18)),
          Text(
            metric.value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Text(
                  metric.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: AranyixColors.onSurfaceMuted),
                ),
              ),
              Text(
                metric.trend,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: metric.trend == '↑'
                      ? AranyixColors.forest
                      : metric.trend == '↓'
                          ? const Color(0xFF059669)
                          : AranyixColors.onSurfaceMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AskAranyixCard extends StatelessWidget {
  const _AskAranyixCard({required this.onTap, required this.onMic});

  final VoidCallback onTap;
  final VoidCallback onMic;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ask Aranyix', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F1),
                  borderRadius: BorderRadius.circular(AranyixRadii.card),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Ask anything about your forest…',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AranyixColors.onSurfaceMuted,
                            ),
                      ),
                    ),
                    IconButton(
                      onPressed: onMic,
                      icon: const Icon(Icons.mic_none_rounded, color: AranyixColors.forest),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
