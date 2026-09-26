import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/responsive_content.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

/// Owned and adopted trees with stewardship check-in actions.
class CitizenStewardshipScreen extends ConsumerStatefulWidget {
  const CitizenStewardshipScreen({super.key});

  @override
  ConsumerState<CitizenStewardshipScreen> createState() => _CitizenStewardshipScreenState();
}

class _CitizenStewardshipScreenState extends ConsumerState<CitizenStewardshipScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _loading = true;
  String? _error;
  List<dynamic> _owned = [];
  List<dynamic> _adopted = [];
  int _dueCount = 0;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.citizenStewardship();
      if (!mounted) return;
      setState(() {
        _owned = List<dynamic>.from(data['owned'] ?? []);
        _adopted = List<dynamic>.from(data['adopted'] ?? []);
        _dueCount = (data['due_count'] as num?)?.toInt() ?? 0;
        _loading = false;
      });
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    if (!isCitizenByotUser(user)) {
      return stackRouteScaffold(
        location: '/citizen/stewardship',
        appBar: ShellTopBar(title: l10n.citizenStewardshipHubTitle, menuWithBack: true),
        body: Center(child: Text(l10n.citizenAdoptNotAvailable)),
      );
    }

    return stackRouteScaffold(
      location: '/citizen/stewardship',
      appBar: ShellTopBar(title: l10n.citizenStewardshipHubTitle, menuWithBack: true),
      body: ResponsiveContent(
        child: Column(
          children: [
            if (_dueCount > 0)
              MaterialBanner(
                content: Text(l10n.citizenStewardshipDue(_dueCount)),
                actions: const [SizedBox.shrink()],
              ),
            TabBar(
              controller: _tabs,
              tabs: [
                Tab(text: l10n.citizenStewardshipOwnedTab),
                Tab(text: l10n.citizenStewardshipAdoptedTab),
              ],
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!, textAlign: TextAlign.center),
                                const SizedBox(height: 12),
                                FilledButton(onPressed: _load, child: Text(l10n.retry)),
                              ],
                            ),
                          ),
                        )
                      : TabBarView(
                          controller: _tabs,
                          children: [
                            _treeList(
                              l10n,
                              _owned,
                              emptyLabel: l10n.citizenStewardshipEmptyOwned,
                            ),
                            _treeList(
                              l10n,
                              _adopted,
                              emptyLabel: l10n.citizenStewardshipEmptyAdopted,
                              allowRelinquish: true,
                            ),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _relinquish(String treeId) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.citizenRelinquishTitle),
        content: Text(l10n.citizenRelinquishConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.citizenRelinquishAction)),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.citizenRelinquishTree(treeId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.citizenRelinquishSuccess)),
      );
      await _load();
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiErrorMessage(e))),
      );
    }
  }

  Widget _treeList(
    AppLocalizations l10n,
    List<dynamic> items, {
    required String emptyLabel,
    bool allowRelinquish = false,
  }) {
    if (items.isEmpty) {
      return Center(child: Text(emptyLabel, textAlign: TextAlign.center));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final map = Map<String, dynamic>.from(items[index] as Map);
          final id = map['id'] as String? ?? '';
          final species = map['species_text'] as String? ?? 'Tree';
          final code = map['public_code'] as String? ?? '';
          final due = map['next_checkin_due'] == true;
          return Card(
            child: ListTile(
              title: Text(species),
              subtitle: Text([
                if (code.isNotEmpty) code,
                if (due) l10n.citizenStewardshipDueBadge,
              ].join(' · ')),
              trailing: due
                  ? FilledButton.tonal(
                      onPressed: id.isEmpty ? null : () => context.push('/trees/$id/survival'),
                      child: Text(l10n.citizenStewardshipCheckIn),
                    )
                  : allowRelinquish
                      ? PopupMenuButton<String>(
                          onSelected: (value) {
                            if (value == 'relinquish' && id.isNotEmpty) {
                              _relinquish(id);
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(
                              value: 'relinquish',
                              child: Text(l10n.citizenRelinquishAction),
                            ),
                          ],
                        )
                      : const Icon(Icons.chevron_right),
              onTap: id.isEmpty ? null : () => context.push('/trees/$id'),
            ),
          );
        },
      ),
    );
  }
}
