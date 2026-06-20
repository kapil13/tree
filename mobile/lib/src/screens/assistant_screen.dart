import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';

class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});
  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _input = TextEditingController(text: 'How much CO2 will 50 Neem trees sequester in 10 years?');
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
      setState(() => _msgs.add((role: 'assistant', text: e.toString())));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI assistant')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _msgs.length,
              itemBuilder: (_, i) {
                final m = _msgs[i];
                final isUser = m.role == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.all(12),
                    constraints: const BoxConstraints(maxWidth: 320),
                    decoration: BoxDecoration(
                      color: isUser ? const Color(0xFF15803D) : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      m.text,
                      style: TextStyle(color: isUser ? Colors.white : Colors.black87),
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  Expanded(child: TextField(controller: _input, decoration: const InputDecoration(hintText: 'Ask anything…'))),
                  IconButton(onPressed: busy ? null : _ask, icon: const Icon(Icons.send, color: Color(0xFF15803D))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
