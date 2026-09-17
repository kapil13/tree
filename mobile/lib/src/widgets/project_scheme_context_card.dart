import 'package:flutter/material.dart';

/// Scheme label and government reference summary for planting projects.
class ProjectSchemeContextCard extends StatelessWidget {
  const ProjectSchemeContextCard({
    super.key,
    required this.scheme,
    required this.project,
  });

  final Map<String, dynamic>? scheme;
  final Map<String, dynamic> project;

  @override
  Widget build(BuildContext context) {
    if (scheme == null) return const SizedBox.shrink();

    final refs = (project['metadata'] as Map?)?['scheme_refs'] as Map? ?? {};
    final schemeCode = project['scheme_code'] as String?;
    final rows = _metadataRows(schemeCode, refs);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Scheme programme', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              scheme!['label'] as String? ?? schemeCode ?? 'Scheme',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            if (scheme!['ministry'] != null)
              Text(
                scheme!['ministry'] as String,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
              ),
            if (rows.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('Government references', style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 6),
              for (final row in rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 132,
                        child: Text(
                          row.label,
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ),
                      Expanded(
                        child: Text(row.value, style: const TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetadataRow {
  const _MetadataRow(this.label, this.value);

  final String label;
  final String value;
}

List<_MetadataRow> _metadataRows(String? schemeCode, Map refs) {
  if (schemeCode == 'raj_amrit_poshan_vatika') {
    return [
      if (refs['apv_site_id'] != null) _MetadataRow('Site ID', '${refs['apv_site_id']}'),
      if (refs['site_type'] != null) _MetadataRow('Site type', _siteTypeLabel('${refs['site_type']}')),
      if (refs['anganwadi_name'] != null) _MetadataRow('Anganwadi', '${refs['anganwadi_name']}'),
      if (refs['shg_name'] != null) _MetadataRow('SHG', '${refs['shg_name']}'),
      if (refs['gram_panchayat'] != null) _MetadataRow('Gram panchayat', '${refs['gram_panchayat']}'),
      if (refs['site_area_ha'] != null) _MetadataRow('Site area', '${refs['site_area_ha']} ha'),
      if (refs['target_fruit_trees'] != null)
        _MetadataRow('Target fruit trees', '${refs['target_fruit_trees']}'),
      if (refs['mgnrega_job_card_ref'] != null)
        _MetadataRow('MGNREGA ref', '${refs['mgnrega_job_card_ref']}'),
    ];
  }

  final generic = <_MetadataRow>[];
  if (refs['nhai_package'] != null) generic.add(_MetadataRow('NHAI package', '${refs['nhai_package']}'));
  if (refs['pca_number'] != null) generic.add(_MetadataRow('PCA number', '${refs['pca_number']}'));
  if (refs['nagar_van_project_id'] != null) {
    generic.add(_MetadataRow('Nagar Van ID', '${refs['nagar_van_project_id']}'));
  }
  return generic;
}

String _siteTypeLabel(String code) {
  switch (code) {
    case 'anganwadi':
      return 'Anganwadi centre';
    case 'shg':
      return 'SHG nutri-garden';
    case 'panchayat':
      return 'Gram panchayat land';
    case 'school':
      return 'School / campus';
    default:
      return code;
  }
}
