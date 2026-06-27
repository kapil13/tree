import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('BYOT'),
        actions: [
          IconButton(onPressed: () => context.push('/notifications'), icon: const Icon(Icons.notifications_outlined)),
          IconButton(onPressed: () => context.push('/profile'), icon: const Icon(Icons.person_outline)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/trees/new'),
        icon: const Icon(Icons.add),
        label: const Text('Add tree'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: dashAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) {
            final message = ApiClient.errorMessage(e is DioException ? e : e);
            final unauthorized = e is DioException && e.response?.statusCode == 401;
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    if (unauthorized)
                      FilledButton(
                        onPressed: () => context.go('/login'),
                        child: const Text('Sign in'),
                      )
                    else
                      FilledButton(
                        onPressed: () => ref.invalidate(dashboardProvider),
                        child: const Text('Retry'),
                      ),
                  ],
                ),
              ),
            );
          },
          data: (data) {
            final k = data['kpi'] as Map<String, dynamic>;
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _kpiGrid(k),
                const SizedBox(height: 16),
                _navTile(context, 'Trees', Icons.park_outlined, '/trees'),
                _navTile(context, 'Map', Icons.map_outlined, '/map'),
                _navTile(context, 'AI assistant', Icons.auto_awesome, '/assistant'),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _kpiGrid(Map<String, dynamic> k) {
    final tiles = [
      ['Trees', '${k['total_trees']}'],
      ['CO₂e (t)', '${(k['total_co2e_kg'] / 1000).toStringAsFixed(2)}'],
      ['Lifetime credits', '${k['lifetime_credits_tco2e']}'],
      ['Healthy %', '${k['pct_healthy']}'],
    ];
    return GridView.count(
      shrinkWrap: true,
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      physics: const NeverScrollableScrollPhysics(),
      children: tiles
          .map((t) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t[0], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const Spacer(),
                      Text(t[1], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ))
          .toList(),
    );
  }

  Widget _navTile(BuildContext c, String label, IconData icon, String path) => Card(
        child: ListTile(
          leading: Icon(icon),
          title: Text(label),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => c.push(path),
        ),
      );
}
