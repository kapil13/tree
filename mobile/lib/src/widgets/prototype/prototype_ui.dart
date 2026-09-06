import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Shared widgets matching design/prototypes v4.2 visual language.

class PrototypeProjectChip extends StatelessWidget {
  const PrototypeProjectChip({super.key, required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: PrototypeColors.bgSubtle,
      borderRadius: BorderRadius.circular(PrototypeRadii.sm),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.sm),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 180),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.sm),
            border: Border.all(color: PrototypeColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.folder_outlined, size: 12, color: PrototypeColors.textSecondary),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: PrototypeColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeContextStrip extends StatelessWidget {
  const PrototypeContextStrip({super.key, required this.project, this.meta});

  final String project;
  final String? meta;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: PrototypeColors.bgSurface,
        border: Border.all(color: PrototypeColors.border),
        borderRadius: BorderRadius.circular(PrototypeRadii.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            project,
            style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: PrototypeColors.textPrimary),
          ),
          if (meta != null && meta!.isNotEmpty)
            Text(
              meta!,
              style: GoogleFonts.dmSans(fontSize: 11, color: PrototypeColors.textSecondary),
            ),
        ],
      ),
    );
  }
}

enum PrototypeStatusLevel { healthy, attention, critical }

class PrototypeStatusBanner extends StatelessWidget {
  const PrototypeStatusBanner({
    super.key,
    required this.title,
    required this.detail,
    required this.score,
    required this.level,
    this.onTap,
  });

  final String title;
  final String detail;
  final int score;
  final PrototypeStatusLevel level;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = switch (level) {
      PrototypeStatusLevel.healthy => (const Color(0xFFDCFCE7), const Color(0xFF86EFAC), '✓'),
      PrototypeStatusLevel.attention => (const Color(0xFFFEF3C7), const Color(0xFFFCD34D), '⚠'),
      PrototypeStatusLevel.critical => (const Color(0xFFFEE2E2), const Color(0xFFFCA5A5), '⚠'),
    };

    return Material(
      color: colors.$1,
      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
            border: Border.all(color: colors.$2),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(colors.$3, style: const TextStyle(fontSize: 18)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(detail, style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary)),
                  ],
                ),
              ),
              Text(
                '$score',
                style: GoogleFonts.ibmPlexMono(fontSize: 22, fontWeight: FontWeight.w700, color: PrototypeColors.brandForest),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeNextUpHero extends StatelessWidget {
  const PrototypeNextUpHero({
    super.key,
    required this.label,
    required this.title,
    required this.subtitle,
    required this.action,
    this.fieldStyle = false,
    this.onTap,
  });

  final String label;
  final String title;
  final String subtitle;
  final String action;
  final bool fieldStyle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: fieldStyle ? const Color(0xFFF0F7F3) : const Color(0xFFFFF5F5),
      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.fromLTRB(16, 14, 56, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
            border: Border.all(color: fieldStyle ? PrototypeColors.border : const Color(0xFFFCA5A5)),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: fieldStyle
                  ? [const Color(0xFFF0F7F3), Colors.white]
                  : [const Color(0xFFFFF5F5), Colors.white],
            ),
          ),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.dmSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                      color: fieldStyle ? PrototypeColors.brandCanopy : PrototypeColors.statusDanger,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(title, style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary)),
                ],
              ),
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                child: Center(
                  child: Text(
                    action,
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: PrototypeColors.brandCanopy,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeSignal {
  const PrototypeSignal({required this.value, required this.label, this.onTap});

  final String value;
  final String label;
  final VoidCallback? onTap;
}

class PrototypeSignalStrip extends StatelessWidget {
  const PrototypeSignalStrip({super.key, required this.signals});

  final List<PrototypeSignal> signals;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          for (final s in signals)
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: s == signals.last ? 0 : 8),
                child: Material(
                  color: PrototypeColors.bgSurface,
                  borderRadius: BorderRadius.circular(PrototypeRadii.md),
                  child: InkWell(
                    onTap: s.onTap,
                    borderRadius: BorderRadius.circular(PrototypeRadii.md),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(PrototypeRadii.md),
                        border: Border.all(color: PrototypeColors.border),
                      ),
                      child: Column(
                        children: [
                          Text(
                            s.value,
                            style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            s.label,
                            style: GoogleFonts.dmSans(fontSize: 10, color: PrototypeColors.textSecondary),
                          ),
                        ],
                      ),
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

class PrototypeSectionHeader extends StatelessWidget {
  const PrototypeSectionHeader({super.key, required this.title, this.linkLabel, this.onLink});

  final String title;
  final String? linkLabel;
  final VoidCallback? onLink;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700, color: PrototypeColors.textPrimary),
            ),
          ),
          if (linkLabel != null)
            TextButton(
              onPressed: onLink,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                linkLabel!,
                style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: PrototypeColors.brandCanopy),
              ),
            ),
        ],
      ),
    );
  }
}

class PrototypePriorityCard extends StatelessWidget {
  const PrototypePriorityCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
    this.severity = 'medium',
    this.onTap,
  });

  final String icon;
  final String title;
  final String subtitle;
  final String? action;
  final String severity;
  final VoidCallback? onTap;

  Color _iconBg() {
    return switch (severity) {
      'critical' => const Color(0xFFFEE2E2),
      'high' => const Color(0xFFFEF3C7),
      _ => PrototypeColors.bgSubtle,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: PrototypeColors.bgSurface,
      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
            border: Border.all(color: PrototypeColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: _iconBg(), borderRadius: BorderRadius.circular(10)),
                child: Text(icon, style: const TextStyle(fontSize: 16)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
                    Text(subtitle, style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary)),
                  ],
                ),
              ),
              if (action != null)
                Text(action!, style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: PrototypeColors.brandCanopy))
              else
                const Icon(Icons.chevron_right, size: 18, color: PrototypeColors.textTertiary),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeMapPreview extends StatelessWidget {
  const PrototypeMapPreview({super.key, required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        child: Container(
          height: 140,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
            border: Border.all(color: PrototypeColors.border),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFB8C9B0), Color(0xFFD4DDD0), Color(0xFFA8B8A0)],
            ),
          ),
          child: Stack(
            children: [
              Positioned(top: 42, left: 48, child: _pin(const Color(0xFFB91C1C))),
              Positioned(top: 70, left: 88, child: _pin(PrototypeColors.brandCanopy)),
              Positioned(
                left: 12,
                right: 12,
                bottom: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(PrototypeRadii.sm),
                  ),
                  child: Text(
                    label,
                    style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w500, color: PrototypeColors.textSecondary),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _pin(Color color) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
    );
  }
}

class PrototypeConnectedProject extends StatelessWidget {
  const PrototypeConnectedProject({
    super.key,
    required this.name,
    required this.meta,
    required this.badge,
    this.badgeOk = true,
    this.onTap,
  });

  final String name;
  final String meta;
  final String badge;
  final bool badgeOk;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: PrototypeColors.bgSurface,
      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
            border: Border.all(color: PrototypeColors.border),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(meta, style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeOk ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(PrototypeRadii.sm),
                ),
                child: Text(
                  badge,
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: badgeOk ? PrototypeColors.brandCanopy : const Color(0xFFB45309),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeActivityItem extends StatelessWidget {
  const PrototypeActivityItem({super.key, required this.title, required this.time, this.onTap});

  final String title;
  final String time;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(right: 10),
                decoration: const BoxDecoration(color: PrototypeColors.brandCanopy, shape: BoxShape.circle),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500)),
                    Text(time, style: GoogleFonts.dmSans(fontSize: 11, color: PrototypeColors.textTertiary)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 16, color: PrototypeColors.textTertiary),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeFieldCaptureBar extends StatelessWidget {
  const PrototypeFieldCaptureBar({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        decoration: const BoxDecoration(
          color: PrototypeColors.bgApp,
          border: Border(top: BorderSide(color: PrototypeColors.border)),
        ),
        child: FilledButton(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: PrototypeColors.brandForest,
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(PrototypeRadii.md)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 22,
                height: 22,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('+', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
              ),
              const SizedBox(width: 8),
              Text(label, style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15)),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeCommandBar extends StatelessWidget implements PreferredSizeWidget {
  const PrototypeCommandBar({
    super.key,
    required this.title,
    this.projectLabel,
    this.onMenu,
    this.onProject,
    this.alertCount = 0,
    this.onAlerts,
    this.actions,
  });

  final String title;
  final String? projectLabel;
  final VoidCallback? onMenu;
  final VoidCallback? onProject;
  final int alertCount;
  final VoidCallback? onAlerts;
  final List<Widget>? actions;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: PrototypeColors.bgApp,
      foregroundColor: PrototypeColors.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      leading: onMenu != null
          ? IconButton(icon: const Icon(Icons.menu_rounded), onPressed: onMenu, tooltip: 'Menu')
          : null,
      title: Text(
        title,
        style: GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w600, color: PrototypeColors.textPrimary),
      ),
      actions: [
        if (projectLabel != null) ...[
          PrototypeProjectChip(label: projectLabel!, onTap: onProject),
          const SizedBox(width: 4),
        ],
        if (onAlerts != null)
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                onPressed: onAlerts,
                icon: const Icon(Icons.notifications_outlined),
                tooltip: 'Alerts',
              ),
              if (alertCount > 0)
                Positioned(
                  right: 10,
                  top: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: PrototypeColors.statusDanger,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      alertCount > 9 ? '9+' : '$alertCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
            ],
          ),
        ...?actions,
        const SizedBox(width: 4),
      ],
    );
  }
}

/// Prototype design tokens (design/prototypes/css/design-system.css).
abstract final class PrototypeColors {
  static const brandForest = Color(0xFF0B3D2E);
  static const brandCanopy = Color(0xFF15803D);
  static const bgApp = Color(0xFFF7F8F6);
  static const bgSurface = Color(0xFFFFFFFF);
  static const bgSubtle = Color(0xFFEEF1EE);
  static const textPrimary = Color(0xFF0F1410);
  static const textSecondary = Color(0xFF5C665E);
  static const textTertiary = Color(0xFF8A938C);
  static const border = Color(0xFFDDE2DC);
  static const statusDanger = Color(0xFFB91C1C);
}

abstract final class PrototypeRadii {
  static const sm = 6.0;
  static const md = 10.0;
  static const lg = 14.0;
}
