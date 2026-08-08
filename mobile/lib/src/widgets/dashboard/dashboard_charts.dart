import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../theme.dart';

/// Interactive dashboard charts — carbon growth, health mix, species split.
class DashboardChartsSection extends StatelessWidget {
  const DashboardChartsSection({super.key, required this.dashboard});

  final Map<String, dynamic> dashboard;

  @override
  Widget build(BuildContext context) {
    final carbon = _series(dashboard['carbon_growth']);
    final health = _series(dashboard['health_distribution'], dropZeros: true);
    final species = _series(dashboard['species_distribution'], dropZeros: true);
    final carbonTotal = carbon.fold<double>(0, (sum, p) => sum + p.value);

    if (carbon.isEmpty && health.isEmpty && species.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text('Insights', style: Theme.of(context).textTheme.titleMedium),
        ),
        if (carbon.isNotEmpty) ...[
          _ChartCard(
            title: 'Carbon growth',
            subtitle: carbonTotal > 0
                ? 'Estimated sequestration trend'
                : 'Run AI analysis on trees to start accumulating credits',
            height: 200,
            child: _CarbonLineChart(points: carbon),
          ),
          const SizedBox(height: 12),
        ],
        if (health.isNotEmpty) ...[
          _ChartCard(
            title: 'Tree health',
            subtitle: 'Distribution across your portfolio',
            height: 200,
            child: _HealthPieChart(slices: health),
          ),
          const SizedBox(height: 12),
        ],
        if (species.isNotEmpty)
          _ChartCard(
            title: 'Species mix',
            subtitle: 'Top registered species',
            height: 200,
            child: _SpeciesBarChart(bars: species.take(6).toList()),
          ),
      ],
    );
  }

  List<_ChartPoint> _series(dynamic raw, {bool dropZeros = false}) {
    if (raw is! List) return [];
    final points = raw.map((e) {
      final m = e as Map<String, dynamic>;
      return _ChartPoint(
        label: m['label'] as String? ?? '',
        value: (m['value'] as num?)?.toDouble() ?? 0,
      );
    }).toList();
    if (dropZeros) {
      return points.where((p) => p.value > 0).toList();
    }
    // Keep zero carbon series visible so accumulation is not "missing"
    return points;
  }
}

class _ChartPoint {
  const _ChartPoint({required this.label, required this.value});
  final String label;
  final double value;
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.subtitle,
    required this.height,
    required this.child,
  });

  final String title;
  final String subtitle;
  final double height;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 2),
            Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            SizedBox(height: height, child: child),
          ],
        ),
      ),
    );
  }
}

class _CarbonLineChart extends StatelessWidget {
  const _CarbonLineChart({required this.points});

  final List<_ChartPoint> points;

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[];
    for (var i = 0; i < points.length; i++) {
      spots.add(FlSpot(i.toDouble(), points[i].value));
    }
    final maxY = points.map((p) => p.value).reduce((a, b) => a > b ? a : b) * 1.2;

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxY <= 0 ? 1 : maxY,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: Colors.black.withValues(alpha: 0.05),
            strokeWidth: 1,
          ),
        ),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              getTitlesWidget: (v, _) => Text(
                v >= 1000 ? '${(v / 1000).toStringAsFixed(0)}k' : v.toStringAsFixed(0),
                style: const TextStyle(fontSize: 10, color: AranyixColors.onSurfaceMuted),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (v, meta) {
                final i = v.toInt();
                if (i < 0 || i >= points.length) return const SizedBox.shrink();
                final label = points[i].label;
                final short = label.length > 6 ? label.substring(0, 5) : label;
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    short,
                    style: const TextStyle(fontSize: 10, color: AranyixColors.onSurfaceMuted),
                  ),
                );
              },
            ),
          ),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (spots) => spots
                .map(
                  (s) => LineTooltipItem(
                    '${points[s.x.toInt()].label}\n${s.y.toStringAsFixed(1)} kg',
                    const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                )
                .toList(),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: AranyixColors.forest,
            barWidth: 3,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              color: AranyixColors.forest.withValues(alpha: 0.12),
            ),
          ),
        ],
      ),
    );
  }
}

class _HealthPieChart extends StatelessWidget {
  const _HealthPieChart({required this.slices});

  final List<_ChartPoint> slices;

  static const _colors = [
    AranyixColors.forest,
    Color(0xFF22C55E),
    Color(0xFFF59E0B),
    Color(0xFFEF4444),
    Color(0xFF64748B),
  ];

  @override
  Widget build(BuildContext context) {
    final total = slices.fold<double>(0, (s, p) => s + p.value);
    if (total <= 0) return const Center(child: Text('No health data yet'));

    return Row(
      children: [
        Expanded(
          flex: 3,
          child: PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 36,
              sections: [
                for (var i = 0; i < slices.length; i++)
                  PieChartSectionData(
                    value: slices[i].value,
                    color: _colors[i % _colors.length],
                    radius: 52,
                    title: '${((slices[i].value / total) * 100).round()}%',
                    titleStyle: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
              ],
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < slices.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _colors[i % _colors.length],
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          slices[i].label,
                          style: const TextStyle(fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SpeciesBarChart extends StatelessWidget {
  const _SpeciesBarChart({required this.bars});

  final List<_ChartPoint> bars;

  @override
  Widget build(BuildContext context) {
    final maxY = bars.map((b) => b.value).reduce((a, b) => a > b ? a : b) * 1.15;

    return BarChart(
      BarChartData(
        maxY: maxY <= 0 ? 1 : maxY,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: Colors.black.withValues(alpha: 0.05),
            strokeWidth: 1,
          ),
        ),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (v, meta) {
                final i = v.toInt();
                if (i < 0 || i >= bars.length) return const SizedBox.shrink();
                final label = bars[i].label;
                final short = label.length > 8 ? '${label.substring(0, 7)}…' : label;
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    short,
                    style: const TextStyle(fontSize: 9, color: AranyixColors.onSurfaceMuted),
                  ),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: [
          for (var i = 0; i < bars.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: bars[i].value,
                  color: AranyixColors.forest.withValues(alpha: 0.85),
                  width: 16,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
