import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// First-run coach marks for key navigation destinations.
class CoachMarks {
  CoachMarks._();

  static const _prefix = 'byot_coach_';

  static Future<bool> shouldShow(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool('$_prefix$key') ?? false);
  }

  static Future<void> markShown(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_prefix$key', true);
  }

  static Future<void> showIfNeeded({
    required BuildContext context,
    required String key,
    required String title,
    required String body,
    GlobalKey? anchorKey,
  }) async {
    if (!await shouldShow(key)) return;
    if (!context.mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () async {
              await markShown(key);
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: Text(MaterialLocalizations.of(ctx).okButtonLabel),
          ),
        ],
      ),
    );
  }
}
