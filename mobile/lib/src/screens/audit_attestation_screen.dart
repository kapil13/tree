import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_errors.dart';
import '../audit_workspace.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class AuditAttestationScreen extends ConsumerStatefulWidget {
  const AuditAttestationScreen({super.key, required this.engagementId});

  final String engagementId;

  @override
  ConsumerState<AuditAttestationScreen> createState() => _AuditAttestationScreenState();
}

class _AuditAttestationScreenState extends ConsumerState<AuditAttestationScreen> {
  final _summaryController = TextEditingController();
  final _notesController = TextEditingController();
  final _cosignNotesController = TextEditingController();
  final _rationaleController = TextEditingController();
  String _verdict = 'conditional';
  String _disposition = 'uphold';
  String? _reviewingAnomalyId;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _summaryController.dispose();
    _notesController.dispose();
    _cosignNotesController.dispose();
    _rationaleController.dispose();
    super.dispose();
  }

  Future<void> _reviewAnomaly(String anomalyId) async {
    final l10n = AppLocalizations.of(context)!;
    final rationale = _rationaleController.text.trim();
    if (rationale.isEmpty) {
      setState(() => _error = l10n.auditReviewRationaleRequired);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.reviewAuditAnomaly(
        engagementId: widget.engagementId,
        anomalyId: anomalyId,
        disposition: _disposition,
        rationale: rationale,
      );
      ref.invalidate(auditAttestationProvider(widget.engagementId));
      ref.invalidate(auditPortfolioSummaryProvider);
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _reviewingAnomalyId = null;
        _rationaleController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.auditReviewSaved)));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  Future<void> _signAttestation() async {
    final l10n = AppLocalizations.of(context)!;
    final summary = _summaryController.text.trim();
    if (summary.isEmpty) {
      setState(() => _error = l10n.auditSignSummaryRequired);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.signAuditAttestation(
        engagementId: widget.engagementId,
        verdict: _verdict,
        summary: summary,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );
      ref.invalidate(auditAttestationProvider(widget.engagementId));
      ref.invalidate(auditPortfolioSummaryProvider);
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.auditSignSaved)));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  Future<void> _cosignAttestation() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.cosignAuditAttestation(
        engagementId: widget.engagementId,
        notes: _cosignNotesController.text.trim().isEmpty ? null : _cosignNotesController.text.trim(),
      );
      ref.invalidate(auditAttestationProvider(widget.engagementId));
      ref.invalidate(auditPortfolioSummaryProvider);
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.auditCosignSaved)));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  Future<void> _createVerifyLink() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final result = await api.createAuditVerificationLink(widget.engagementId);
      ref.invalidate(auditAttestationProvider(widget.engagementId));
      final url = result['public_url'] as String?;
      if (!mounted) return;
      setState(() => _submitting = false);
      if (url != null) {
        await Clipboard.setData(ClipboardData(text: url));
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.auditVerifyLinkCopied)));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  Future<void> _openVerifyUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (widget.engagementId.isEmpty) {
      return stackRouteScaffold(
        location: '/audit/attestation',
        appBar: PrototypeBackBar(title: l10n.auditAttestationTitle),
        body: Center(child: Text(l10n.auditAttestationUnavailable)),
      );
    }
    final attestationAsync = ref.watch(auditAttestationProvider(widget.engagementId));

    return stackRouteScaffold(
      location: '/audit/attestation',
      appBar: PrototypeBackBar(title: l10n.auditAttestationTitle),
      body: attestationAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(auditAttestationProvider(widget.engagementId)),
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final engagementStatus = data['status'] as String? ?? '';
          if (!auditAttestationEnabled(engagementStatus)) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: PrototypeEmptyState(
                  icon: '🔒',
                  title: l10n.auditAttestationLocked,
                  subtitle: l10n.auditAttestationExportRequired,
                ),
              ),
            );
          }

          final reviewQueue = Map<String, dynamic>.from(data['review_queue'] as Map? ?? {});
          final items = List<Map<String, dynamic>>.from(
            (reviewQueue['items'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? [],
          );
          final pendingReviews = (reviewQueue['pending_review_count'] as num?)?.toInt() ?? 0;
          final attestation = data['attestation'] as Map<String, dynamic>?;
          final signatures = List<Map<String, dynamic>>.from(
            (data['signatures'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? [],
          );
          final canSign = data['can_sign'] == true;
          final canCosign = data['can_cosign'] == true;
          final verifyUrl = data['public_verify_url'] as String?;
          final requiredSignatures = (data['required_signatures'] as num?)?.toInt() ?? 2;
          final pendingCosignatures = (data['pending_cosignatures'] as num?)?.toInt() ?? 0;

          return RefreshIndicator(
            color: PrototypeColors.brandCanopy,
            onRefresh: () async => ref.invalidate(auditAttestationProvider(widget.engagementId)),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                PrototypeContextStrip(
                  project: auditEngagementStatusLabel(engagementStatus),
                  meta: l10n.auditAttestationMobileSubtitle,
                ),
                if (verifyUrl != null)
                  _VerifyLinkCard(
                    url: verifyUrl,
                    onCopy: () async {
                      await Clipboard.setData(ClipboardData(text: verifyUrl));
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.auditVerifyLinkCopied)),
                      );
                    },
                    onOpen: () => _openVerifyUrl(verifyUrl),
                    copyLabel: l10n.auditCopyVerifyLink,
                    openLabel: l10n.auditOpenVerifyLink,
                  )
                else
                  OutlinedButton(
                    onPressed: _submitting ? null : _createVerifyLink,
                    child: Text(l10n.auditCreateVerifyLink),
                  ),
                if (attestation != null && attestation['status'] == 'signed') ...[
                  const SizedBox(height: 12),
                  _SignedCard(
                    verdict: attestation['verdict'] as String? ?? '',
                    summary: attestation['summary'] as String? ?? '',
                    hash: attestation['attestation_hash'] as String?,
                    signedLabel: l10n.auditSignedVerdict(attestation['verdict'] as String? ?? ''),
                  ),
                ],
                if (signatures.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  PrototypeSectionHeader(
                    title: l10n.auditSignaturesTitle(signatures.length, requiredSignatures),
                  ),
                  for (final sig in signatures)
                    PrototypePriorityCard(
                      icon: '✓',
                      title: '${sig['role']} · ${sig['verdict']}',
                      subtitle: sig['summary'] as String? ?? '',
                    ),
                ],
                if (pendingCosignatures > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: PrototypeStatusBadge(
                      label: l10n.auditPendingCosign(pendingCosignatures),
                      variant: 'warn',
                    ),
                  ),
                const SizedBox(height: 16),
                PrototypeSectionHeader(
                  title: l10n.auditAnomalyReviews,
                  linkLabel: pendingReviews > 0 ? '$pendingReviews pending' : null,
                ),
                if (items.isEmpty)
                  Text(
                    l10n.auditNoAnomalies,
                    style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary),
                  )
                else
                  for (final item in items)
                    _AnomalyReviewCard(
                      item: item,
                      reviewing: _reviewingAnomalyId == item['id'],
                      disposition: _disposition,
                      rationaleController: _rationaleController,
                      onStartReview: () => setState(() {
                        _reviewingAnomalyId = item['id'] as String?;
                        _rationaleController.clear();
                        _disposition = 'uphold';
                      }),
                      onCancelReview: () => setState(() => _reviewingAnomalyId = null),
                      onDispositionChanged: (value) => setState(() => _disposition = value ?? 'uphold'),
                      onSubmit: () => _reviewAnomaly(item['id'] as String),
                      submitting: _submitting,
                      upholdLabel: l10n.auditDispositionUphold,
                      overturnLabel: l10n.auditDispositionOverturn,
                      deferLabel: l10n.auditDispositionDefer,
                      reviewLabel: l10n.auditReviewAnomaly,
                      saveLabel: l10n.save,
                      cancelLabel: l10n.cancel,
                    ),
                if (canSign) ...[
                  const SizedBox(height: 20),
                  PrototypeSectionHeader(title: l10n.auditLeadSignOff),
                  DropdownButtonFormField<String>(
                    value: _verdict,
                    decoration: InputDecoration(labelText: l10n.auditVerdictLabel),
                    items: [
                      DropdownMenuItem(value: 'approved', child: Text(l10n.auditVerdictApproved)),
                      DropdownMenuItem(value: 'conditional', child: Text(l10n.auditVerdictConditional)),
                      DropdownMenuItem(value: 'rejected', child: Text(l10n.auditVerdictRejected)),
                    ],
                    onChanged: _submitting ? null : (v) => setState(() => _verdict = v ?? 'conditional'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _summaryController,
                    decoration: InputDecoration(labelText: l10n.auditSignSummaryLabel),
                    maxLines: 3,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _notesController,
                    decoration: InputDecoration(labelText: l10n.auditSignNotesLabel),
                    maxLines: 2,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _submitting ? null : _signAttestation,
                    style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                    child: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(l10n.auditSignAttestation),
                  ),
                ],
                if (canCosign) ...[
                  const SizedBox(height: 20),
                  PrototypeSectionHeader(title: l10n.auditCosignTitle),
                  TextField(
                    controller: _cosignNotesController,
                    decoration: InputDecoration(labelText: l10n.auditCosignNotesLabel),
                    maxLines: 2,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _submitting ? null : _cosignAttestation,
                    style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                    child: Text(l10n.auditCosignAttestation),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.statusDanger),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _VerifyLinkCard extends StatelessWidget {
  const _VerifyLinkCard({
    required this.url,
    required this.onCopy,
    required this.onOpen,
    required this.copyLabel,
    required this.openLabel,
  });

  final String url;
  final VoidCallback onCopy;
  final VoidCallback onOpen;
  final String copyLabel;
  final String openLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(PrototypeRadii.md),
        border: Border.all(color: const Color(0xFFBAE6FD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            url,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.dmSans(fontSize: 12, color: const Color(0xFF0C4A6E)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(onPressed: onCopy, child: Text(copyLabel)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(onPressed: onOpen, child: Text(openLabel)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SignedCard extends StatelessWidget {
  const _SignedCard({
    required this.verdict,
    required this.summary,
    required this.hash,
    required this.signedLabel,
  });

  final String verdict;
  final String summary;
  final String? hash;
  final String signedLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(PrototypeRadii.md),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            signedLabel,
            style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF065F46)),
          ),
          const SizedBox(height: 4),
          Text(summary, style: GoogleFonts.dmSans(fontSize: 13, color: const Color(0xFF047857))),
          if (hash != null && hash!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '${hash!.substring(0, 16)}…',
                style: GoogleFonts.dmSans(fontSize: 11, color: const Color(0xFF047857)),
              ),
            ),
        ],
      ),
    );
  }
}

class _AnomalyReviewCard extends StatelessWidget {
  const _AnomalyReviewCard({
    required this.item,
    required this.reviewing,
    required this.disposition,
    required this.rationaleController,
    required this.onStartReview,
    required this.onCancelReview,
    required this.onDispositionChanged,
    required this.onSubmit,
    required this.submitting,
    required this.upholdLabel,
    required this.overturnLabel,
    required this.deferLabel,
    required this.reviewLabel,
    required this.saveLabel,
    required this.cancelLabel,
  });

  final Map<String, dynamic> item;
  final bool reviewing;
  final String disposition;
  final TextEditingController rationaleController;
  final VoidCallback onStartReview;
  final VoidCallback onCancelReview;
  final ValueChanged<String?> onDispositionChanged;
  final VoidCallback onSubmit;
  final bool submitting;
  final String upholdLabel;
  final String overturnLabel;
  final String deferLabel;
  final String reviewLabel;
  final String saveLabel;
  final String cancelLabel;

  @override
  Widget build(BuildContext context) {
    final needsReview = item['needs_review'] == true;
    final latestReview = item['latest_review'] as Map<String, dynamic>?;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item['title'] as String? ?? 'Anomaly',
                    style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
                if (needsReview)
                  PrototypeStatusBadge(label: item['severity'] as String? ?? 'medium', variant: 'warn'),
              ],
            ),
            if (item['boundary_name'] != null)
              Text(
                item['boundary_name'] as String,
                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
              ),
            if (latestReview != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '${latestReview['disposition']}: ${latestReview['rationale']}',
                  style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
                ),
              ),
            if (needsReview && !reviewing)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(onPressed: onStartReview, child: Text(reviewLabel)),
              ),
            if (reviewing) ...[
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: disposition,
                decoration: const InputDecoration(labelText: 'Disposition'),
                items: [
                  DropdownMenuItem(value: 'uphold', child: Text(upholdLabel)),
                  DropdownMenuItem(value: 'overturn', child: Text(overturnLabel)),
                  DropdownMenuItem(value: 'defer', child: Text(deferLabel)),
                ],
                onChanged: submitting ? null : onDispositionChanged,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: rationaleController,
                decoration: const InputDecoration(labelText: 'Rationale'),
                maxLines: 3,
                enabled: !submitting,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  TextButton(onPressed: submitting ? null : onCancelReview, child: Text(cancelLabel)),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: submitting ? null : onSubmit,
                    child: Text(saveLabel),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
