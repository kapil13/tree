import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../auth/signup_catalog.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/auth_scaffold.dart';

/// In-app professional org profile — mirrors web org-profile wizard.
class OrgProfileWizardScreen extends ConsumerStatefulWidget {
  const OrgProfileWizardScreen({super.key});

  @override
  ConsumerState<OrgProfileWizardScreen> createState() => _OrgProfileWizardScreenState();
}

class _OrgProfileWizardScreenState extends ConsumerState<OrgProfileWizardScreen> {
  final _orgName = TextEditingController();
  final _designation = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _workEmail = TextEditingController();
  final _phone = TextEditingController();
  final _website = TextEditingController();
  final _address = TextEditingController();
  final _regId = TextEditingController();
  final _department = TextEditingController();
  final _useCase = TextEditingController();

  String _orgType = 'government';
  bool _busy = false;
  String? _error;
  String? _programName;

  @override
  void initState() {
    super.initState();
    _prefillFromUser();
    _loadOnboarding();
  }

  void _prefillFromUser() {
    final user = sessionController.user;
    if (user == null) return;
    _workEmail.text = user['email'] as String? ?? '';
    _phone.text = user['phone'] as String? ?? '';
    final code = user['pending_program_code'] as String? ?? 'byot';
    _orgType = _defaultOrgType(code);
    _programName = categoryByCode(code).title;
  }

  String _defaultOrgType(String code) {
    if (code.contains('corporate')) return 'corporate';
    if (code.contains('ngo')) return 'ngo';
    return 'government';
  }

  Future<void> _loadOnboarding() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final state = await api.onboardingState();
      if (!mounted) return;
      setState(() {
        _programName = state['program_name'] as String? ?? _programName;
      });
    } catch (_) {}
  }

  Future<void> _submit() async {
    if (_orgName.text.trim().length < 2 || _designation.text.trim().length < 2) {
      setState(() => _error = 'Organization name and designation are required.');
      return;
    }
    if (_city.text.trim().length < 2 || _state.text.trim().length < 2) {
      setState(() => _error = 'City and state are required.');
      return;
    }
    if (_useCase.text.trim().length < 10) {
      setState(() => _error = 'Describe your use case in at least 10 characters.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.submitOrgProfile({
        'organization_name': _orgName.text.trim(),
        'organization_type': _orgType,
        'designation': _designation.text.trim(),
        'city': _city.text.trim(),
        'state': _state.text.trim(),
        'country': 'IN',
        if (_workEmail.text.trim().isNotEmpty) 'work_email': _workEmail.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'contact_phone': _phone.text.trim(),
        if (_website.text.trim().isNotEmpty) 'website': _website.text.trim(),
        if (_address.text.trim().isNotEmpty) 'registered_address': _address.text.trim(),
        if (_regId.text.trim().isNotEmpty) 'registration_id': _regId.text.trim(),
        if (_department.text.trim().isNotEmpty) 'department': _department.text.trim(),
        'use_case_summary': _useCase.text.trim(),
      });
      final user = await api.me();
      sessionController.setUser(user);
      if (!mounted) return;
      context.go('/onboarding/pending');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _orgName.dispose();
    _designation.dispose();
    _city.dispose();
    _state.dispose();
    _workEmail.dispose();
    _phone.dispose();
    _website.dispose();
    _address.dispose();
    _regId.dispose();
    _department.dispose();
    _useCase.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Organization details',
      subtitle:
          'Complete your ${_programName ?? 'professional'} application. You can use BYOT features while we review.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _orgName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Organization name *'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _orgType,
            decoration: const InputDecoration(labelText: 'Organization type *'),
            items: const [
              DropdownMenuItem(value: 'government', child: Text('Government / public agency')),
              DropdownMenuItem(value: 'corporate', child: Text('Corporate / industry')),
              DropdownMenuItem(value: 'ngo', child: Text('NGO / community')),
            ],
            onChanged: _busy ? null : (v) => setState(() => _orgType = v ?? 'government'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _designation,
            decoration: const InputDecoration(labelText: 'Your designation *'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _city,
                  decoration: const InputDecoration(labelText: 'City *'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _state,
                  decoration: const InputDecoration(labelText: 'State *'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _workEmail,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Work email'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Contact phone'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _department,
            decoration: const InputDecoration(labelText: 'Department (optional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _website,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(labelText: 'Website (optional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _address,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Registered address (optional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _regId,
            decoration: const InputDecoration(labelText: 'Registration / GST ID (optional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _useCase,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'How will you use Aranyix? *',
              alignLabelWithHint: true,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Submitting…' : 'Submit for review'),
          ),
        ],
      ),
    );
  }
}
