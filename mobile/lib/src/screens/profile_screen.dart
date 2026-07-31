import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../app_bootstrap.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../services/app_settings.dart';
import '../services/security_services.dart';

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
      appBar: AppBar(title: Text(l10n.profile)),
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
            if (canSeeCarbon(user))
              ListTile(
                leading: const Icon(Icons.eco_outlined),
                title: const Text('Carbon calculator'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/carbon'),
              ),
            if (canSeeReports(user))
              ListTile(
                leading: const Icon(Icons.description_outlined),
                title: const Text('Reports'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/reports'),
              ),
            if (canSeeCredits(user))
              ListTile(
                leading: const Icon(Icons.account_balance_outlined),
                title: const Text('Credits'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/credits'),
              ),
            if (canSeeFieldOps(user))
              ListTile(
                leading: const Icon(Icons.construction_outlined),
                title: const Text('Field ops'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/field-ops'),
              ),
            if (canSeeMonitoring(user))
              ListTile(
                leading: const Icon(Icons.monitor_heart_outlined),
                title: const Text('Monitoring'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/monitoring'),
              ),
            if (canSeeBioacoustic(user))
              ListTile(
                leading: const Icon(Icons.graphic_eq),
                title: const Text('Bioacoustic'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/bioacoustic'),
              ),
            if (canSeeAssistant(user))
              ListTile(
                leading: const Icon(Icons.auto_awesome),
                title: const Text('Assistant'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/assistant'),
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
