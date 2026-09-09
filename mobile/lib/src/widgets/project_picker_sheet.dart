import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../project_context.dart';
import '../providers.dart';
import 'prototype/prototype_ui.dart';

void _invalidateProjectScoped(WidgetRef ref) {
  ref.invalidate(treesProvider);
  ref.invalidate(dashboardProvider);
  ref.invalidate(fieldOpsSummaryProvider);
  ref.invalidate(monitoringSummaryProvider);
}

Future<void> showProjectPickerSheet(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context)!;
  final projectsAsync = ref.read(plantingProjectsProvider);
  final projects = projectsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
  final selectedId = ref.read(selectedProjectIdProvider);

  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: PrototypeColors.bgSurface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
    ),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Text(l10n.projects, style: Theme.of(ctx).textTheme.titleLarge),
          ),
          ListTile(
            leading: const Icon(Icons.public, color: PrototypeColors.brandForest),
            title: Text(l10n.homeAllSites),
            trailing: selectedId == null ? const Icon(Icons.check, color: PrototypeColors.brandForest) : null,
            onTap: () async {
              await ref.read(selectedProjectIdProvider.notifier).setProjectId(null);
              _invalidateProjectScoped(ref);
              if (ctx.mounted) Navigator.pop(ctx);
            },
          ),
          for (final raw in projects)
            ListTile(
              leading: const Icon(Icons.folder_outlined, color: PrototypeColors.brandForest),
              title: Text((raw as Map<String, dynamic>)['name'] as String? ?? l10n.projectFallback),
              subtitle: Text((raw)['code'] as String? ?? ''),
              trailing: selectedId == (raw)['id']
                  ? const Icon(Icons.check, color: PrototypeColors.brandForest)
                  : null,
              onTap: () async {
                await ref.read(selectedProjectIdProvider.notifier).setProjectId(raw['id'] as String);
                _invalidateProjectScoped(ref);
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
