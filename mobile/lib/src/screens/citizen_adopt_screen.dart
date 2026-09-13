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

/// Browse adoptable BYOT trees and adopt by public code.
class CitizenAdoptScreen extends ConsumerStatefulWidget {
  const CitizenAdoptScreen({super.key});

  @override
  ConsumerState<CitizenAdoptScreen> createState() => _CitizenAdoptScreenState();
}

class _CitizenAdoptScreenState extends ConsumerState<CitizenAdoptScreen> {
  final _codeCtrl = TextEditingController();
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _message;
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final page = await api.listCitizenAdoptableTrees();
      if (!mounted) return;
      setState(() {
        _items = page.items;
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

  Future<void> _adoptByCode() async {
    final code = _codeCtrl.text.trim();
    if (code.length < 6) {
      setState(() => _error = 'Enter a valid tree public code.');
      return;
    }
    await _adopt(publicCode: code);
  }

  Future<void> _adopt({String? treeId, String? publicCode}) async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      if (publicCode != null) {
        await api.citizenAdoptByCode(publicCode);
      } else if (treeId != null) {
        await api.citizenAdoptTree(treeId);
      }
      if (!mounted) return;
      setState(() {
        _message = AppLocalizations.of(context)!.citizenAdoptSuccess;
      });
      await _load();
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      if (!mounted) return;
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    if (!isCitizenByotUser(user)) {
      return stackRouteScaffold(
        location: '/citizen/adopt',
        appBar: ShellTopBar(title: l10n.citizenAdoptTitle, menuWithBack: true),
        body: Center(child: Text(l10n.citizenAdoptNotAvailable)),
      );
    }

    return stackRouteScaffold(
      location: '/citizen/adopt',
      appBar: ShellTopBar(title: l10n.citizenAdoptTitle, menuWithBack: true),
      body: ResponsiveContent(
        padding: const EdgeInsets.all(16),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  children: [
                    Text(l10n.citizenAdoptSubtitle, style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _codeCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        labelText: l10n.citizenAdoptCodeLabel,
                        hintText: 'BYOT-XXXX-XXXX',
                        prefixIcon: const Icon(Icons.qr_code_2_outlined),
                      ),
                      onSubmitted: (_) {
                        if (!_busy) _adoptByCode();
                      },
                    ),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: _busy ? null : _adoptByCode,
                      child: Text(_busy ? l10n.saving : l10n.citizenAdoptByCode),
                    ),
                    if (_message != null) ...[
                      const SizedBox(height: 12),
                      Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    Text(l10n.citizenAdoptBrowseTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    if (_items.isEmpty)
                      Text(l10n.citizenAdoptEmpty, style: Theme.of(context).textTheme.bodySmall)
                    else
                      ..._items.map((item) {
                        final map = Map<String, dynamic>.from(item as Map);
                        final id = map['id'] as String? ?? '';
                        final code = map['public_code'] as String? ?? '';
                        final species = map['species_text'] as String? ?? 'Tree';
                        final owner = map['owner_name'] as String?;
                        return Card(
                          child: ListTile(
                            title: Text(species),
                            subtitle: Text(
                              [
                                if (code.isNotEmpty) code,
                                if (owner != null && owner.isNotEmpty) 'by $owner',
                              ].join(' · '),
                            ),
                            trailing: _busy
                                ? null
                                : TextButton(
                                    onPressed: id.isEmpty ? null : () => _adopt(treeId: id),
                                    child: Text(l10n.citizenAdoptAction),
                                  ),
                            onTap: id.isEmpty ? null : () => context.push('/trees/$id'),
                          ),
                        );
                      }),
                  ],
                ),
              ),
      ),
    );
  }
}
