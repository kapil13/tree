import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../app_bootstrap.dart';
import '../providers.dart';
import '../services/app_settings.dart';
import '../services/security_services.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';

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
  bool _biometricAvailable = false;
  String _appVersion = '';

  @override
  void initState() {
    super.initState();
    _loadPrograms();
    _loadSecurity();
  }

  Future<void> _loadSecurity() async {
    final canBio = await PushRegistrationService.instance.canUseBiometrics();
    final version = await appVersionLabel();
    if (!mounted) return;
    setState(() {
      _biometricAvailable = canBio;
      _appVersion = version;
    });
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
    final l10n = AppLocalizations.of(context)!;
    final settings = AppSettings.instance;
    return Scaffold(
      appBar: ShellTopBar(title: l10n.profile),
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
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AranyixRadii.card),
                border: Border.all(color: AranyixColors.border),
                boxShadow: AranyixShadows.card,
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: AranyixColors.forestLight,
                    foregroundColor: AranyixColors.forest,
                    child: Text(
                      ((user['full_name'] as String?) ?? 'A').trim().isEmpty
                          ? 'A'
                          : ((user['full_name'] as String).trim()[0].toUpperCase()),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user['full_name'] as String? ?? 'Aranyix user',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 17,
                            color: AranyixColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user['email'] as String? ?? '',
                          style: const TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 13.5),
                        ),
                        if (user['role'] != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AranyixColors.forestLight,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '${user['role']}',
                              style: const TextStyle(
                                color: AranyixColors.forestDark,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Edit personal profile'),
              subtitle: const Text('Name, phone, date of birth, city, state'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/profile/edit'),
            ),
            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.fromLTRB(4, 8, 4, 0),
              child: Text(
                'Registration programs',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AranyixColors.forestDark,
                ),
              ),
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
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(l10n.language, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            RadioListTile<Locale?>(
              title: Text(l10n.languageEnglish),
              value: const Locale('en'),
              groupValue: settings.locale ?? const Locale('en'),
              onChanged: (value) => settings.setLocale(value),
            ),
            RadioListTile<Locale?>(
              title: Text(l10n.languageHindi),
              value: const Locale('hi'),
              groupValue: settings.locale ?? const Locale('en'),
              onChanged: (value) => settings.setLocale(value),
            ),
            const Divider(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(l10n.security, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            SwitchListTile(
              title: Text(l10n.pushNotifications),
              subtitle: Text(l10n.pushNotificationsHint),
              value: settings.pushEnabled,
              onChanged: (v) async {
                await settings.setPushEnabled(v);
                if (v && context.mounted) {
                  await PushRegistrationService.instance
                      .registerIfEnabled(() => ref.read(apiClientProvider.future));
                }
              },
            ),
            if (_biometricAvailable)
              SwitchListTile(
                title: Text(l10n.biometricUnlock),
                value: settings.biometricUnlock,
                onChanged: (v) => settings.setBiometricUnlock(v),
              ),
            SwitchListTile(
              title: Text(l10n.screenshotGuard),
              value: settings.screenshotGuard,
              onChanged: (v) async {
                await settings.setScreenshotGuard(v);
                await ScreenshotGuard.apply(v);
              },
            ),
            SwitchListTile(
              title: Text(l10n.certificatePinning),
              value: settings.certificatePinning,
              onChanged: settings.setCertificatePinning,
            ),
            SwitchListTile(
              title: Text(l10n.analyticsEnabled),
              subtitle: Text(l10n.analyticsHint),
              value: settings.analyticsEnabled,
              onChanged: settings.setAnalyticsEnabled,
            ),
            if (_appVersion.isNotEmpty)
              ListTile(
                dense: true,
                title: const Text('App version'),
                subtitle: Text(_appVersion),
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
