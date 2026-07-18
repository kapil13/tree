import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../providers.dart';

class TreeListScreen extends ConsumerWidget {
  const TreeListScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trees = ref.watch(treesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Trees')),
      body: trees.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) {
          if (maybeRedirectUnauthorized(ref, context, e)) {
            return const Center(child: CircularProgressIndicator());
          }
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(apiErrorMessage(e), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => ref.invalidate(treesProvider),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        },
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('No trees yet.'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => context.push('/trees/new'),
                    child: const Text('Add your first tree'),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(treesProvider),
            child: ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final t = items[i] as Map<String, dynamic>;
                final carbon = (t['current_carbon_kg'] as num?)?.toStringAsFixed(0) ?? '0';
                return ListTile(
                  title: Text(t['species_text'] ?? 'Unknown'),
                  subtitle: Text('${t['public_code']} · ${t['current_health'] ?? 'unknown'}'),
                  trailing: Text('$carbon kg'),
                  onTap: () => context.push('/trees/${t['id']}'),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
