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
import '../theme.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _loadingPrograms = false;
  bool _programBusy = false;
  String? _programMessage;
  List<dynamic> _available = [];
  List<dynamic> _accessRequests = [];
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

  Map<String, dynamic>? _requestFor(String code) {
    for (final raw in _accessRequests) {
      final req = Map<String, dynamic>.from(raw as Map);
      if (req['program_code'] == code) return req;
    }
    return null;
  }

  Future<void> _loadPrograms() async {
    setState(() => _loadingPrograms = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.plantingProgramMemberships();
      final available = List<dynamic>.from(data['available'] ?? []);
      final requests = List<dynamic>.from(data['access_requests'] ?? []);
      if (!mounted) return;
      setState(() {
        _available = available;
        _accessRequests = requests;
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

  Future<void> _requestAccess(String programCode) async {
    setState(() {
      _programBusy = true;
      _programMessage = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.submitProgramAccessRequest(programCode: programCode);
      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      setState(() {
        _programBusy = false;
        _programMessage = l10n.requestSubmitted;
      });
      await _loadPrograms();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _programBusy = false;
        _programMessage = apiErrorMessage(e);
      });
    }
  }

  Future<void> _withdrawAccess(String requestId) async {
    setState(() {
      _programBusy = true;
      _programMessage = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.withdrawProgramAccessRequest(requestId);
      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      setState(() {
        _programBusy = false;
        _programMessage = l10n.requestWithdrawn;
      });
      await _loadPrograms();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _programBusy = false;
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
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 4, 4),
              child: Text(
                l10n.registrationPrograms,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AranyixColors.forestDark,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
              child: Text(
                l10n.programsHint,
                style: const TextStyle(fontSize: 12.5, color: AranyixColors.onSurfaceMuted, height: 1.35),
              ),
            ),
            if (_loadingPrograms)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              ..._available.map((raw) {
                final program = Map<String, dynamic>.from(raw as Map);
                final code = program['code'] as String? ?? '';
                final isDefault = program['is_default'] == true;
                final enrolled = program['enrolled'] == true || isDefault;
                final access = _requestFor(code);
                final status = access?['status'] as String?;
                final requestId = access?['id']?.toString();

                String badge;
                Color badgeBg;
                Color badgeFg;
                if (enrolled) {
                  badge = l10n.programActive;
                  badgeBg = AranyixColors.forestLight;
                  badgeFg = AranyixColors.forestDark;
                } else if (status == 'pending') {
                  badge = l10n.programPending;
                  badgeBg = const Color(0xFFFFF4E8);
                  badgeFg = const Color(0xFF9A3412);
                } else if (status == 'rejected') {
                  badge = l10n.programRejected;
                  badgeBg = AranyixColors.dangerContainer;
                  badgeFg = AranyixColors.danger;
                } else {
                  badge = l10n.programLocked;
                  badgeBg = const Color(0xFFE7EEE9);
                  badgeFg = AranyixColors.onSurfaceMuted;
                }

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                program['name'] as String? ?? code,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: badgeBg,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                badge,
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: badgeFg,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if ((program['description'] as String?)?.isNotEmpty == true) ...[
                          const SizedBox(height: 4),
                          Text(
                            program['description'] as String,
                            style: const TextStyle(fontSize: 12.5, color: AranyixColors.onSurfaceMuted),
                          ),
                        ],
                        if (!enrolled && !isDefault) ...[
                          const SizedBox(height: 10),
                          if (status == 'pending' && requestId != null)
                            OutlinedButton(
                              onPressed: _programBusy ? null : () => _withdrawAccess(requestId),
                              child: Text(l10n.withdrawRequest),
                            )
                          else if (status != 'pending')
                            FilledButton(
                              onPressed: _programBusy ? null : () => _requestAccess(code),
                              child: Text(l10n.requestAccess),
                            ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            if (_programMessage != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 4, 8),
                child: Text(
                  _programMessage!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AranyixColors.forestDark,
                      ),
                ),
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
