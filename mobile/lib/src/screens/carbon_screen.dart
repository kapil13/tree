import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

class CarbonScreen extends ConsumerStatefulWidget {
  const CarbonScreen({super.key});

  @override
  ConsumerState<CarbonScreen> createState() => _CarbonScreenState();
}

class _CarbonScreenState extends ConsumerState<CarbonScreen> {
  final _species = TextEditingController();
  final _dbh = TextEditingController();
  final _height = TextEditingController();
  final _age = TextEditingController();
  bool _busy = false;
  Map<String, dynamic>? _result;
  String? _error;

  @override
  void dispose() {
    _species.dispose();
    _dbh.dispose();
    _height.dispose();
    _age.dispose();
    super.dispose();
  }

  Future<void> _estimate() async {
    final species = _species.text.trim();
    if (species.isEmpty) {
      setState(() => _error = 'Enter a species name.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _result = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final result = await api.carbonEstimate(
        species: species,
        dbhCm: double.tryParse(_dbh.text.trim()),
        heightM: double.tryParse(_height.text.trim()),
        ageYears: double.tryParse(_age.text.trim()),
      );
      if (mounted) setState(() => _result = result);
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _formatTonnes(double kg) {
    final tonnes = kg / 1000;
    if (tonnes >= 1000) return tonnes.toStringAsFixed(0);
    if (tonnes >= 10) return tonnes.toStringAsFixed(1);
    return tonnes.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final dashboardAsync = ref.watch(dashboardProvider);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final co2e = (_result?['co2e_kg'] as num?)?.toDouble();
    final lower = (_result?['co2e_kg_lower_90'] as num?)?.toDouble();
    final upper = (_result?['co2e_kg_upper_90'] as num?)?.toDouble();
    final uncertainty = (_result?['uncertainty_pct'] as num?)?.toDouble();
    final notes = List<dynamic>.from(_result?['notes'] ?? []);

    return stackRouteScaffold(
      location: '/carbon',
      appBar: ShellTopBar(title: l10n.navCarbon),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          dashboardAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
            ),
            error: (e, _) => Text(apiErrorMessage(e)),
            data: (dashboard) {
              final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
              final totalCo2eKg = (kpi['total_co2e_kg'] as num?)?.toDouble() ?? 0;
              final annualSeq = (kpi['annual_sequestration_kg'] as num?)?.toDouble() ?? 0;
              final totalTrees = (kpi['total_trees'] as num?)?.toInt() ?? 0;
              final progress = annualSeq > 0 ? (totalCo2eKg / (annualSeq * 12)).clamp(0.0, 1.0) : 0.68;

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF14532D), Color(0xFF166534)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                      boxShadow: [
                        BoxShadow(
                          color: PrototypeColors.brandForest.withValues(alpha: 0.25),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Text(
                          _formatTonnes(totalCo2eKg),
                          style: GoogleFonts.dmSans(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        Text(
                          'tCO₂e estimated (portfolio)',
                          style: GoogleFonts.dmSans(fontSize: 14, color: Colors.white.withValues(alpha: 0.9)),
                        ),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 8,
                            backgroundColor: Colors.white.withValues(alpha: 0.2),
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          annualSeq > 0
                              ? '${(progress * 100).round()}% of annual sequestration pace'
                              : '$totalTrees trees in portfolio',
                          style: GoogleFonts.dmSans(fontSize: 12, color: Colors.white.withValues(alpha: 0.85)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('By project', style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  projectsAsync.when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Text(apiErrorMessage(e)),
                    data: (projects) {
                      if (projects.isEmpty) {
                        return Text(
                          'No planting projects yet.',
                          style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary),
                        );
                      }
                      final perTree = totalTrees > 0 ? totalCo2eKg / totalTrees : 2.6 * (44 / 12);
                      return Column(
                        children: projects.map((raw) {
                          final p = raw as Map<String, dynamic>;
                          final trees = (p['tree_count'] as num?)?.toInt() ?? 0;
                          final estimateKg = trees * perTree;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: PrototypeColors.bgSurface,
                              borderRadius: BorderRadius.circular(PrototypeRadii.md),
                              border: Border.all(color: PrototypeColors.border),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    p['name'] as String? ?? 'Project',
                                    style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                Text(
                                  '${_formatTonnes(estimateKg)} tCO₂e',
                                  style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: PrototypeColors.brandForest),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  Text(l10n.carbonTitle, style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                ],
              );
            },
          ),
          Text(
            'Estimate CO₂e from species and optional measurements. '
            'This is an Estimate — not a Live field measurement or registry-issued credit.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AranyixColors.onSurfaceMuted),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _species,
            decoration: InputDecoration(labelText: l10n.speciesLabel),
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _dbh,
            decoration: InputDecoration(labelText: l10n.dbhLabel),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _height,
            decoration: InputDecoration(labelText: l10n.heightLabel),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _age,
            decoration: InputDecoration(labelText: l10n.ageYearsLabel),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _estimate,
            child: Text(_busy ? l10n.saving : l10n.estimate),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (_result != null) ...[
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.estimate, style: const TextStyle(fontWeight: FontWeight.w600, color: AranyixColors.forest)),
                    const SizedBox(height: 8),
                    Text(
                      lower != null && upper != null && upper > lower
                          ? '${lower.toStringAsFixed(1)}–${upper.toStringAsFixed(1)} kg CO₂e (90% CI)'
                          : co2e != null
                              ? '${co2e.toStringAsFixed(1)} kg CO₂e'
                              : '—',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                    ),
                    if (uncertainty != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        '±${uncertainty.toStringAsFixed(1)}% measurement + model uncertainty',
                        style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(l10n.carbonKg((_result!['carbon_kg'] as num?)?.toStringAsFixed(1) ?? '—')),
                    Text(l10n.inputCompleteness((_result!['confidence'] as num?)?.toStringAsFixed(2) ?? '—')),
                    Text(l10n.methodologyLabel(_result!['methodology']?.toString() ?? '—')),
                    const SizedBox(height: 8),
                    const Text(
                      'Honesty label: Estimate (modelled). Not Live sensor data.',
                      style: TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
                    ),
                    if (notes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      for (final n in notes) Text('• $n', style: const TextStyle(fontSize: 12)),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
