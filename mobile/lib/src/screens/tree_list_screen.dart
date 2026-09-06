import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../widgets/offline_connectivity_banner.dart';
import '../widgets/prototype/prototype_ui.dart';

enum _RegistryCategory { all, attention, missingEvidence, staleMonitoring, unverified, healthy }

enum _RegistrySort { recent, code, health }

const _pageSize = 50;

class TreeListScreen extends ConsumerStatefulWidget {
  const TreeListScreen({super.key});

  @override
  ConsumerState<TreeListScreen> createState() => _TreeListScreenState();
}

class _TreeListScreenState extends ConsumerState<TreeListScreen> {
  final _searchCtrl = TextEditingController();
  _RegistryCategory _category = _RegistryCategory.all;
  _RegistrySort _sort = _RegistrySort.recent;
  int _page = 1;
  bool _loading = true;
  String? _error;
  List<dynamic> _items = [];
  int _total = 0;
  bool _showFilterSheet = false;
  String? _healthFilter;
  String? _projectFilter;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({int? page}) async {
    final nextPage = page ?? _page;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final result = await api.listTreesPage(
        page: nextPage,
        pageSize: _pageSize,
        health: _healthFilter,
        projectId: _projectFilter,
      );
      if (mounted) {
        setState(() {
          _items = result.items;
          _total = result.total;
          _page = nextPage;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = apiErrorMessage(e);
          _loading = false;
        });
      }
    }
  }

  List<dynamic> _filteredItems() {
    final q = _searchCtrl.text.trim().toLowerCase();
    var list = List<dynamic>.from(_items);
    if (q.isNotEmpty) {
      list = list.where((t) {
        final m = t as Map<String, dynamic>;
        final code = (m['public_code'] as String? ?? '').toLowerCase();
        final species = (m['species_text'] as String? ?? '').toLowerCase();
        final area = (m['work_area_name'] as String? ?? '').toLowerCase();
        return code.contains(q) || species.contains(q) || area.contains(q);
      }).toList();
    }
    list = list.where((t) => _matchesCategory(t as Map<String, dynamic>)).toList();
    list.sort((a, b) => _compare(a as Map<String, dynamic>, b as Map<String, dynamic>));
    return list;
  }

  bool _matchesCategory(Map<String, dynamic> t) {
    switch (_category) {
      case _RegistryCategory.all:
        return true;
      case _RegistryCategory.attention:
        final h = (t['current_health'] as String? ?? '').toLowerCase();
        return h == 'stressed' || h == 'dead' || h == 'critical';
      case _RegistryCategory.missingEvidence:
        return t['satellite_verified'] != true;
      case _RegistryCategory.staleMonitoring:
        final geotag = t['last_geotag_at'];
        if (geotag == null) return true;
        try {
          final dt = DateTime.parse(geotag as String);
          return DateTime.now().difference(dt).inDays > 90;
        } catch (_) {
          return true;
        }
      case _RegistryCategory.unverified:
        return t['satellite_verified'] != true;
      case _RegistryCategory.healthy:
        final h = (t['current_health'] as String? ?? '').toLowerCase();
        return h == 'healthy' || h == 'good';
    }
  }

  int _compare(Map<String, dynamic> a, Map<String, dynamic> b) {
    switch (_sort) {
      case _RegistrySort.code:
        return (a['public_code'] as String? ?? '').compareTo(b['public_code'] as String? ?? '');
      case _RegistrySort.health:
        return (a['current_health'] as String? ?? '').compareTo(b['current_health'] as String? ?? '');
      case _RegistrySort.recent:
        final da = a['created_at'] as String? ?? '';
        final db = b['created_at'] as String? ?? '';
        return db.compareTo(da);
    }
  }

  int _categoryCount(_RegistryCategory cat) {
    if (cat == _RegistryCategory.all) return _total;
    return _items.where((t) => _matchesCategoryFor(t as Map<String, dynamic>, cat)).length;
  }

  bool _matchesCategoryFor(Map<String, dynamic> t, _RegistryCategory cat) {
    final prev = _category;
    _category = cat;
    final result = _matchesCategory(t);
    _category = prev;
    return result;
  }

  int get _pages => (_total / _pageSize).ceil().clamp(1, 9999);

  void _openFilterSheet() {
    setState(() => _showFilterSheet = true);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: PrototypeColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Filters', style: GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                Text('Health', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final h in [null, 'healthy', 'stressed', 'dead'])
                      PrototypeFilterChip(
                        label: h ?? 'All',
                        selected: _healthFilter == h,
                        onTap: () {
                          setState(() => _healthFilter = h);
                          Navigator.pop(ctx);
                          _load(page: 1);
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () {
                    setState(() {
                      _healthFilter = null;
                      _projectFilter = null;
                    });
                    Navigator.pop(ctx);
                    _load(page: 1);
                  },
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: const Text('Clear filters'),
                ),
              ],
            ),
          ),
        );
      },
    ).whenComplete(() => setState(() => _showFilterSheet = false));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(userProvider).maybeWhen(data: (d) => d, orElse: () => null);
    final canAdd = canAddTrees(user);
    final filtered = _filteredItems();
    final pages = _pages;
    final rangeStart = (_page - 1) * _pageSize + 1;
    final rangeEnd = (_page * _pageSize).clamp(0, _total);

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeBackBar(
        title: 'Tree registry',
        actions: [
          if (canAdd)
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: l10n.addFirstTree,
              onPressed: () => context.push('/trees/new'),
            ),
        ],
      ),
      body: Column(
        children: [
          const OfflineConnectivityBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Search ID, species, area…',
                      hintStyle: GoogleFonts.dmSans(fontSize: 14, color: PrototypeColors.textTertiary),
                      filled: true,
                      fillColor: PrototypeColors.bgSurface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(PrototypeRadii.md),
                        borderSide: const BorderSide(color: PrototypeColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(PrototypeRadii.md),
                        borderSide: const BorderSide(color: PrototypeColors.border),
                      ),
                      prefixIcon: const Icon(Icons.search, size: 20, color: PrototypeColors.textTertiary),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _openFilterSheet,
                  icon: const Icon(Icons.filter_list),
                  style: IconButton.styleFrom(
                    backgroundColor: PrototypeColors.bgSurface,
                    side: const BorderSide(color: PrototypeColors.border),
                  ),
                ),
                const SizedBox(width: 4),
                DropdownButtonHideUnderline(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: PrototypeColors.bgSurface,
                      borderRadius: BorderRadius.circular(PrototypeRadii.md),
                      border: Border.all(color: PrototypeColors.border),
                    ),
                    child: DropdownButton<_RegistrySort>(
                      value: _sort,
                      isDense: true,
                      items: const [
                        DropdownMenuItem(value: _RegistrySort.recent, child: Text('Recent')),
                        DropdownMenuItem(value: _RegistrySort.code, child: Text('Tree ID')),
                        DropdownMenuItem(value: _RegistrySort.health, child: Text('Health')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _sort = v);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Text(
                  '$_total',
                  style: GoogleFonts.ibmPlexMono(fontSize: 28, fontWeight: FontWeight.w700, color: PrototypeColors.brandForest),
                ),
                const SizedBox(width: 6),
                Text('trees', style: GoogleFonts.dmSans(fontSize: 14, color: PrototypeColors.textSecondary)),
              ],
            ),
          ),
          SizedBox(
            height: 88,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              children: [
                PrototypeRegistryCategory(
                  count: _categoryCount(_RegistryCategory.all),
                  label: 'All',
                  selected: _category == _RegistryCategory.all,
                  onTap: () => setState(() => _category = _RegistryCategory.all),
                ),
                const SizedBox(width: 8),
                PrototypeRegistryCategory(
                  count: _categoryCount(_RegistryCategory.attention),
                  label: 'Attention',
                  selected: _category == _RegistryCategory.attention,
                  onTap: () => setState(() => _category = _RegistryCategory.attention),
                ),
                const SizedBox(width: 8),
                PrototypeRegistryCategory(
                  count: _categoryCount(_RegistryCategory.missingEvidence),
                  label: 'Missing evidence',
                  selected: _category == _RegistryCategory.missingEvidence,
                  onTap: () => setState(() => _category = _RegistryCategory.missingEvidence),
                ),
                const SizedBox(width: 8),
                PrototypeRegistryCategory(
                  count: _categoryCount(_RegistryCategory.unverified),
                  label: 'Unverified',
                  selected: _category == _RegistryCategory.unverified,
                  onTap: () => setState(() => _category = _RegistryCategory.unverified),
                ),
                const SizedBox(width: 8),
                PrototypeRegistryCategory(
                  count: _categoryCount(_RegistryCategory.healthy),
                  label: 'Healthy',
                  selected: _category == _RegistryCategory.healthy,
                  onTap: () => setState(() => _category = _RegistryCategory.healthy),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                Text(
                  '${filtered.length} on page · $_total total',
                  style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
                ),
                const Spacer(),
                Text('Page $_page of $pages', style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary)),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy))
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(_error!, textAlign: TextAlign.center),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: () => _load(),
                                style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                                child: Text(l10n.retry),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        color: PrototypeColors.brandCanopy,
                        onRefresh: () => _load(),
                        child: filtered.isEmpty
                            ? ListView(
                                children: [
                                  PrototypeEmptyState(
                                    icon: '🌳',
                                    title: 'No trees match',
                                    subtitle: 'Try a different filter or search term',
                                    action: canAdd
                                        ? FilledButton(
                                            onPressed: () => context.push('/trees/new'),
                                            style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                                            child: Text(l10n.addFirstTree),
                                          )
                                        : null,
                                  ),
                                ],
                              )
                            : ListView.separated(
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) => const Divider(height: 1, color: PrototypeColors.border),
                                itemBuilder: (_, i) {
                                  final t = filtered[i] as Map<String, dynamic>;
                                  final badges = <Widget>[];
                                  if (t['satellite_verified'] != true) {
                                    badges.add(const PrototypeStatusBadge(label: 'Unverified', variant: 'warn'));
                                  }
                                  final meta = [
                                    if (t['work_area_name'] != null) t['work_area_name'],
                                    if (t['current_carbon_kg'] != null) '${(t['current_carbon_kg'] as num).toStringAsFixed(0)} kg CO₂',
                                  ].join(' · ');
                                  return PrototypeRegistryRow(
                                    code: t['public_code'] as String? ?? '—',
                                    species: t['species_text'] as String? ?? l10n.unknownSpecies,
                                    meta: meta.isNotEmpty ? meta : '—',
                                    health: t['current_health'] as String?,
                                    badges: badges,
                                    trailing: t['created_at'] != null ? _shortDate(t['created_at'] as String) : null,
                                    onTap: () => context.push('/trees/${t['id']}'),
                                  );
                                },
                              ),
                      ),
          ),
          if (!_loading && _error == null)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              decoration: const BoxDecoration(
                color: PrototypeColors.bgApp,
                border: Border(top: BorderSide(color: PrototypeColors.border)),
              ),
              child: Row(
                children: [
                  OutlinedButton(
                    onPressed: _page <= 1 ? null : () => _load(page: _page - 1),
                    child: const Text('← Prev'),
                  ),
                  Expanded(
                    child: Text(
                      '$rangeStart–$rangeEnd of $_total',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
                    ),
                  ),
                  OutlinedButton(
                    onPressed: _page >= pages ? null : () => _load(page: _page + 1),
                    child: const Text('Next →'),
                  ),
                ],
              ),
            ),
        ],
      ),
      floatingActionButton: canAdd
          ? FloatingActionButton(
              backgroundColor: PrototypeColors.brandForest,
              onPressed: () => context.push('/trees/new'),
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  String _shortDate(String iso) {
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return iso.length > 10 ? iso.substring(0, 10) : iso;
    }
  }
}
