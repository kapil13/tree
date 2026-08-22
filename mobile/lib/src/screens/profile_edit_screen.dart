import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';

class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullName;
  late final TextEditingController _phone;
  late final TextEditingController _city;
  late final TextEditingController _state;
  DateTime? _dob;
  DateTime? _marriage;
  bool _busy = false;
  String? _error;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _fullName = TextEditingController();
    _phone = TextEditingController();
    _city = TextEditingController();
    _state = TextEditingController();
  }

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _city.dispose();
    _state.dispose();
    super.dispose();
  }

  void _loadUser(Map<String, dynamic> user) {
    if (_loaded) return;
    _loaded = true;
    _fullName.text = user['full_name'] as String? ?? '';
    _phone.text = user['phone'] as String? ?? '';
    _city.text = user['city'] as String? ?? '';
    _state.text = user['state'] as String? ?? '';
    _dob = _parseDate(user['date_of_birth']);
    _marriage = _parseDate(user['date_of_marriage']);
  }

  DateTime? _parseDate(Object? raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  String? _formatDate(DateTime? value) {
    if (value == null) return null;
    final y = value.year.toString().padLeft(4, '0');
    final m = value.month.toString().padLeft(2, '0');
    final d = value.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  int? _ageFromDob(DateTime? dob) {
    if (dob == null) return null;
    final now = DateTime.now();
    var age = now.year - dob.year;
    if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) {
      age -= 1;
    }
    return age < 0 ? 0 : age;
  }

  Future<void> _pickDate({
    required DateTime? initial,
    required ValueChanged<DateTime?> onPicked,
    DateTime? firstDate,
    DateTime? lastDate,
  }) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime(1990),
      firstDate: firstDate ?? DateTime(1920),
      lastDate: lastDate ?? DateTime.now(),
    );
    if (picked != null) onPicked(picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.updateProfile(
        fullName: _fullName.text.trim(),
        phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        city: _city.text.trim().isEmpty ? null : _city.text.trim(),
        state: _state.text.trim().isEmpty ? null : _state.text.trim(),
        dateOfBirth: _formatDate(_dob),
        dateOfMarriage: _formatDate(_marriage),
      );
      ref.invalidate(userProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved')),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(userProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: userAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (user) {
          if (!_loaded) {
            _loadUser(user);
          }
          final age = _ageFromDob(_dob);
          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextFormField(
                  controller: _fullName,
                  decoration: const InputDecoration(labelText: 'Full name *'),
                  validator: (v) =>
                      (v == null || v.trim().length < 2) ? 'Enter your full name' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  initialValue: user['email'] as String? ?? '',
                  decoration: const InputDecoration(labelText: 'Email'),
                  readOnly: true,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phone,
                  decoration: const InputDecoration(labelText: 'Phone'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Date of birth'),
                  subtitle: Text(_dob == null ? 'Not set' : _formatDate(_dob)!),
                  trailing: const Icon(Icons.calendar_today_outlined),
                  onTap: _busy
                      ? null
                      : () => _pickDate(
                            initial: _dob,
                            onPicked: (d) => setState(() => _dob = d),
                          ),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Age'),
                  subtitle: Text(age == null ? 'Set date of birth' : '$age years'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Date of marriage'),
                  subtitle: Text(_marriage == null ? 'Not set' : _formatDate(_marriage)!),
                  trailing: const Icon(Icons.calendar_today_outlined),
                  onTap: _busy
                      ? null
                      : () => _pickDate(
                            initial: _marriage ?? _dob,
                            firstDate: _dob,
                            onPicked: (d) => setState(() => _marriage = d),
                          ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _city,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _state,
                  decoration: const InputDecoration(labelText: 'State'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : _save,
                  child: Text(_busy ? 'Saving…' : 'Save profile'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
