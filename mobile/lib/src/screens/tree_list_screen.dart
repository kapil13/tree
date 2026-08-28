import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../widgets/shell_scaffold.dart';

class TreeListScreen extends ConsumerWidget {
  const TreeListScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final trees = ref.watch(treesProvider);
    final user = ref.watch(userProvider).maybeWhen(data: (d) => d, orElse: () => null);
    final canAdd = canAddTrees(user);
    return Scaffold(
      appBar: ShellTopBar(title: l10n.trees),
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
                    child: Text(l10n.retry),
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
                  Text(l10n.noTreesYet),
                  if (canAdd) ...[
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => context.push('/trees/new'),
                      child: Text(l10n.addFirstTree),
                    ),
                  ],
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
                  title: Text(t['species_text'] ?? l10n.unknownSpecies),
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
