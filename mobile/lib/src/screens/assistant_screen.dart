import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';

class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});

  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _input = TextEditingController();
  final List<({String role, String text})> _msgs = [];
  bool busy = false;

  Future<void> _ask() async {
    final prompt = _input.text.trim();
    if (prompt.isEmpty) return;
    setState(() {
      _msgs.add((role: 'user', text: prompt));
      busy = true;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final r = await api.assistant(prompt);
      setState(() {
        _msgs.add((role: 'assistant', text: r['answer'] as String));
        _input.clear();
      });
    } catch (e) {
      setState(() => _msgs.add((role: 'assistant', text: apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('AI')),
      body: Column(
        children: [
          Expanded(
            child: _msgs.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.auto_awesome, size: 40, color: AranyixColors.forest.withValues(alpha: 0.5)),
                          const SizedBox(height: 16),
                          Text(
                            'Ask anything about your forest',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: AranyixColors.onSurfaceMuted,
                                ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _msgs.length,
                    itemBuilder: (_, i) {
                      final m = _msgs[i];
                      final isUser = m.role == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          constraints: const BoxConstraints(maxWidth: 300),
                          decoration: BoxDecoration(
                            color: isUser ? AranyixColors.forest : const Color(0xFFF1F5F1),
                            borderRadius: BorderRadius.circular(AranyixRadii.card),
                          ),
                          child: Text(
                            m.text,
                            style: TextStyle(
                              color: isUser ? Colors.white : const Color(0xFF334155),
                              height: 1.45,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (busy)
            const LinearProgressIndicator(
              minHeight: 2,
              color: AranyixColors.forest,
              backgroundColor: AranyixColors.forestLight,
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(hintText: 'Ask anything about your forest…'),
                      textInputAction: TextInputAction.send,
                      onSubmitted: busy ? null : (_) => _ask(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: busy ? null : _ask,
                    icon: const Icon(Icons.send_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: AranyixColors.forest,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
