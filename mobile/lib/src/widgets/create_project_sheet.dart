import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../screens/projects_list_screen.dart';
import 'prototype/prototype_ui.dart';

String projectCodeFromName(String name) {
  final base = name
      .trim()
      .toUpperCase()
      .replaceAll(RegExp(r'[^A-Z0-9]+'), '_')
      .replaceAll(RegExp(r'_+'), '_')
      .replaceAll(RegExp(r'^_|_$'), '');
  final trimmed = base.isEmpty ? 'PROJECT' : base.substring(0, base.length.clamp(0, 32));
  final suffix = DateTime.now().millisecondsSinceEpoch.toString().substring(7);
  return '${trimmed}_$suffix';
}

Future<void> showCreateProjectSheet(BuildContext context, WidgetRef ref) async {
  final nameController = TextEditingController();
  final descriptionController = TextEditingController();
  var segment = 'general';
  var busy = false;
  String? error;

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: PrototypeColors.bgSurface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
    ),
    builder: (sheetContext) {
      return StatefulBuilder(
        builder: (context, setState) {
          final l10n = AppLocalizations.of(context)!;
          Future<void> submit() async {
            final name = nameController.text.trim();
            if (name.isEmpty) {
              setState(() => error = l10n.createProjectNameRequired);
              return;
            }
            setState(() {
              busy = true;
              error = null;
            });
            try {
              final api = await ref.read(apiClientProvider.future);
              final project = await api.createPlantingProject(
                code: projectCodeFromName(name),
                name: name,
                description: descriptionController.text.trim(),
                segment: segment,
              );
              ref.invalidate(plantingProjectsProvider);
              if (context.mounted) Navigator.of(sheetContext).pop();
              if (context.mounted) {
                context.push('/projects/${project['id']}');
              }
            } catch (e) {
              setState(() {
                busy = false;
                error = apiErrorMessage(e);
              });
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.createProjectTitle,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.createProjectSubtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: PrototypeColors.textSecondary),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(labelText: l10n.createProjectNameLabel),
                  textCapitalization: TextCapitalization.sentences,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descriptionController,
                  decoration: InputDecoration(labelText: l10n.createProjectDescriptionLabel),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: segment,
                  decoration: InputDecoration(labelText: l10n.createProjectSegmentLabel),
                  items: segmentLabels.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: busy ? null : (v) => setState(() => segment = v ?? 'general'),
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: busy ? null : submit,
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(l10n.createProjectTitle),
                ),
              ],
            ),
          );
        },
      );
    },
  );

  nameController.dispose();
  descriptionController.dispose();
}
