import 'package:flutter/material.dart';

import '../theme.dart';
import 'brand_mark.dart';

/// Shared auth layout — calm forest branding for login/signup flows.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.leading,
    this.stepLabel,
    this.stepProgress,
    this.footer,
    this.compact = false,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? leading;
  final String? stepLabel;
  final double? stepProgress;
  final Widget? footer;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AranyixColors.surface,
      drawerEnableOpenDragGesture: false,
      endDrawerEnableOpenDragGesture: false,
      body: Stack(
        children: [
          Positioned(
            top: -80,
            right: -60,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AranyixColors.forest.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned(
            top: 120,
            left: -90,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AranyixColors.leaf.withValues(alpha: 0.08),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (leading != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 8, top: 4),
                    child: Align(alignment: Alignment.centerLeft, child: leading!),
                  ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(24, compact ? 8 : 12, 24, footer != null ? 12 : 28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AranyixBrandMark(
                          size: compact ? 48 : 58,
                          radius: compact ? 14 : 18,
                          showGlow: !compact,
                        ),
                        SizedBox(height: compact ? 14 : 20),
                        Text(
                          title,
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: AranyixColors.forestDark,
                                fontSize: compact ? 26 : null,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          subtitle,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                color: AranyixColors.onSurfaceMuted,
                                height: 1.4,
                                fontSize: compact ? 14.5 : null,
                              ),
                        ),
                        if (stepLabel != null) ...[
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(999),
                                  child: LinearProgressIndicator(
                                    value: stepProgress,
                                    minHeight: 7,
                                    backgroundColor: AranyixColors.forestLight,
                                    color: AranyixColors.forest,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                stepLabel!,
                                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                      color: AranyixColors.forestDark,
                                    ),
                              ),
                            ],
                          ),
                        ],
                        SizedBox(height: compact ? 18 : 24),
                        child,
                      ],
                    ),
                  ),
                ),
                if (footer != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                    child: footer!,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Inline error banner for auth forms.
class AuthErrorBanner extends StatelessWidget {
  const AuthErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AranyixColors.dangerContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.chip),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, size: 18, color: AranyixColors.danger),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF991B1B),
                height: 1.35,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Subtle divider with label (e.g. "or").
class AuthOrDivider extends StatelessWidget {
  const AuthOrDivider({super.key, this.label = 'or'});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: AranyixColors.border)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AranyixColors.onSurfaceMuted,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
        const Expanded(child: Divider(color: AranyixColors.border)),
      ],
    );
  }
}

/// Custom segmented control for auth mode switching.
class AuthModeTabs<T> extends StatelessWidget {
  const AuthModeTabs({
    super.key,
    required this.values,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  final List<T> values;
  final List<String> labels;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceTint,
        borderRadius: BorderRadius.circular(AranyixRadii.button),
        border: Border.all(color: AranyixColors.border),
      ),
      child: Row(
        children: [
          for (var i = 0; i < values.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => onChanged(values[i]),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: selected == values[i] ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: selected == values[i] ? AranyixShadows.card : null,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    labels[i],
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: selected == values[i]
                          ? AranyixColors.forestDark
                          : AranyixColors.onSurfaceMuted,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
