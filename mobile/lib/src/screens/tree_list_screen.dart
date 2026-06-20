import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (items) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(treesProvider),
          child: ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final t = items[i] as Map<String, dynamic>;
              return ListTile(
                title: Text(t['species_text'] ?? 'Unknown'),
                subtitle: Text(t['public_code']),
                trailing: Text('${(t['current_carbon_kg'] as num).toStringAsFixed(0)} kg'),
                onTap: () => context.push('/trees/${t['id']}'),
              );
            },
          ),
        ),
      ),
    );
  }
}
