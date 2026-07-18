import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _loadingPrograms = false;
  bool _savingPrograms = false;
  String? _programMessage;
  List<dynamic> _available = [];
  final Set<String> _selected = {};

  @override
  void initState() {
    super.initState();
    _loadPrograms();
  }

  Future<void> _loadPrograms() async {
    setState(() => _loadingPrograms = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.plantingProgramMemberships();
      final available = List<dynamic>.from(data['available'] ?? []);
      final enrolled = available
          .where((program) => program['enrolled'] == true)
          .map((program) => program['code'] as String)
          .toSet();
      if (!mounted) return;
      setState(() {
        _available = available;
        _selected
          ..clear()
          ..addAll(enrolled);
        _loadingPrograms = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingPrograms = false;
        _programMessage = apiErrorMessage(e);
      });
    }
  }

  Future<void> _savePrograms() async {
    setState(() {
      _savingPrograms = true;
      _programMessage = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.updatePlantingProgramMemberships(_selected.toList());
      if (!mounted) return;
      setState(() {
        _savingPrograms = false;
        _programMessage = 'Registration programs updated.';
      });
      await _loadPrograms();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _savingPrograms = false;
        _programMessage = apiErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(userProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: userAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(userProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (user) => ListView(
          children: [
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: Text(user['full_name'] as String? ?? 'BYOT user'),
              subtitle: Text(user['email'] as String? ?? ''),
            ),
            if (user['role'] != null)
              ListTile(
                leading: const Icon(Icons.badge_outlined),
                title: const Text('Role'),
                subtitle: Text(user['role'] as String),
              ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text('Registration programs', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
            if (_loadingPrograms)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              ..._available.map((program) {
                final code = program['code'] as String;
                final isDefault = program['is_default'] == true;
                return CheckboxListTile(
                  value: _selected.contains(code),
                  onChanged: isDefault || _savingPrograms
                      ? null
                      : (checked) {
                          setState(() {
                            if (checked == true) {
                              _selected.add(code);
                            } else {
                              _selected.remove(code);
                            }
                          });
                        },
                  title: Text(program['name'] as String? ?? code),
                  subtitle: Text(program['description'] as String? ?? ''),
                  secondary: isDefault ? const Icon(Icons.lock_outline) : null,
                );
              }),
            if (_available.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  onPressed: _savingPrograms ? null : _savePrograms,
                  child: Text(_savingPrograms ? 'Saving…' : 'Save program preferences'),
                ),
              ),
            if (_programMessage != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(_programMessage!, style: Theme.of(context).textTheme.bodySmall),
              ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sign out'),
              onTap: () async {
                final api = await ref.read(apiClientProvider.future);
                await api.logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ],
        ),
      ),
    );
  }
}
