import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../auth/onboarding_routing.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/auth_scaffold.dart';

/// Planting audience picker — mirrors web `/onboarding/audience`.
class AudienceOnboardingScreen extends ConsumerStatefulWidget {
  const AudienceOnboardingScreen({super.key});

  @override
  ConsumerState<AudienceOnboardingScreen> createState() => _AudienceOnboardingScreenState();
}

class _AudienceOnboardingScreenState extends ConsumerState<AudienceOnboardingScreen> {
  List<Map<String, dynamic>> _presets = [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPresets();
  }

  Future<void> _loadPresets() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final presets = await api.audiencePresets();
      if (!mounted) return;
      setState(() {
        _presets = presets;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _select(String audience) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.selectAudience(audience);
      final user = await api.me();
      sessionController.setUser(user);
      if (!mounted) return;
      final next = onboardingRedirectPath(user) ?? '/onboarding/org-profile';
      context.go(next);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessage(e);
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AuthScaffold(
      title: 'Choose your planting focus',
      subtitle:
          'We tailor schemes, compliance checklists, and dashboard highlights to your sector.',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                  ),
                ..._presets.map(
                  (preset) => Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      title: Text(preset['label'] as String? ?? preset['code'] as String? ?? ''),
                      subtitle: Text(preset['description'] as String? ?? ''),
                      trailing: _busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.chevron_right),
                      onTap: _busy ? null : () => _select(preset['code'] as String),
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _busy ? null : () => _select('general'),
                  child: const Text('Skip — general plantation'),
                ),
              ],
            ),
    );
  }
}
