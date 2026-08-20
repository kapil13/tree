"""Seeded legal documents editable via Platform CMS."""

from __future__ import annotations

from typing import Any

LEGAL_PAGE_SLUGS = ("terms", "privacy", "data-use")

LEGAL_PAGES_DEFAULT: list[dict[str, Any]] = [
    {
        "slug": "terms",
        "title": "Terms of Service",
        "meta_description": "Terms of Service for the Aranyix / BYOT platform.",
        "sort_order": 100,
        "body": """\
# Terms of Service

Last updated: 26 July 2026

These Terms of Service ("Terms") govern access to and use of the Aranyix platform
(also referred to as BYOT — Bring Your Own Tree), including the website, APIs,
and related mobile applications (the "Service").

## 1. Acceptance

By creating an account or using the Service, you agree to these Terms and our
Privacy Policy and Data Use Policy. If you do not agree, do not use the Service.

## 2. The Service

Aranyix provides tools for plantation monitoring, reporting, and verification
(MRV). Features may include tree registration, maps, satellite and AI-assisted
insights, compliance checklists, and exportable evidence packs.

The Service is designed for audit preparation and operational monitoring. It does
not issue carbon credits, certify legal compliance, or replace professional
legal, forestry, or registry advice.

## 3. Accounts and programs

You are responsible for account credentials and for activity under your account.
Professional program access (for example NHAI, corporate ESG, or NGO pathways)
may require organization onboarding and administrator approval.

## 4. Your content

You retain rights to data and media you upload. You grant Aranyix a license to
host, process, and display that content as needed to operate the Service and
produce reports you request.

You must not upload unlawful content, infringe others' rights, or attempt to
bypass access controls.

## 5. Estimates and frameworks

Carbon, biomass, and similar metrics are estimates based on available inputs and
methodologies (such as IPCC-aligned factors). Framework checklists and reports
are self-assessment / evidence-preparation tools and do not constitute
certification under Verra, Gold Standard, REDD+, NGT/CAMPA, or any other scheme.

## 6. Acceptable use

You agree not to misuse the Service, including by attempting unauthorized access,
interfering with other users, or using the Service to make false or misleading
environmental claims.

## 7. Suspension

We may suspend or terminate accounts or organizations that violate these Terms,
present security risk, or fail to pay applicable fees.

## 8. Disclaimers

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND TO THE MAXIMUM
EXTENT PERMITTED BY LAW. We do not warrant uninterrupted availability or that
outputs will meet any particular registry or regulatory requirement.

## 9. Liability

To the maximum extent permitted by law, Aranyix is not liable for indirect,
incidental, or consequential damages arising from use of the Service.

## 10. Changes

We may update these Terms. Material changes will be reflected by updating the
"Last updated" date and, where appropriate, notifying administrators.

## 11. Contact

For questions about these Terms, contact your organization administrator or the
platform support channel published on the website.

This document is a platform template and should be reviewed by your counsel
before production use.
""",
    },
    {
        "slug": "privacy",
        "title": "Privacy Policy",
        "meta_description": "How Aranyix collects, uses, and protects personal data.",
        "sort_order": 110,
        "body": """\
# Privacy Policy

Last updated: 26 July 2026

This Privacy Policy explains how Aranyix ("we", "us") collects, uses, and shares
personal information when you use the Aranyix / BYOT platform.

## 1. Information we collect

- Account details such as name, email, phone number, and organization affiliation
- Authentication and security data (password hashes, OTP verification events)
- Field and project data you submit (tree locations, photos, metadata, surveys)
- Usage and device information needed to operate and secure the Service
- Payment-related identifiers when you purchase optional features (processed by
  our payment provider; we do not store full card numbers)

## 2. How we use information

- Provide and improve the Service
- Authenticate users and prevent abuse
- Generate monitoring reports and evidence packs you request
- Send operational notifications (alerts, invites, verification codes)
- Comply with legal obligations

## 3. Sharing

We may share information with:

- Service providers that host infrastructure, send SMS/email, or process payments
- Your organization administrators and authorized team members within your workspace
- Authorities when required by law

We do not sell personal information.

## 4. International transfers and retention

Data may be processed in regions where our infrastructure providers operate.
We retain account and project data while your organization uses the Service and
for a reasonable period thereafter for audits, disputes, and legal compliance.

## 5. Your choices

Depending on your role and applicable law, you may request access, correction,
or deletion of personal data by contacting your organization administrator or
platform support. Organization administrators control member access within their
workspace.

## 6. Security

We use industry-standard measures such as encrypted transport, hashed passwords,
and role-based access controls. No method of transmission or storage is fully
secure.

## 7. Children

The Service is not directed to children under 16. Do not create an account for a
child without appropriate legal authority.

## 8. Changes

We may update this Policy and will revise the "Last updated" date when we do.

## 9. Contact & Grievance Officer

**Data Protection Officer:** privacy@byot.earth

You may file a privacy grievance through **Settings → Privacy** in the app, or
email the Data Protection Officer directly. We aim to respond within 72 hours
for data access/export requests under applicable Indian DPDP requirements.

Questions about privacy can also be sent through the support channel on the website.

This document is a platform template and should be reviewed by your counsel
before production use.
""",
    },
    {
        "slug": "data-use",
        "title": "Data Use Policy",
        "meta_description": "How Aranyix uses plantation, satellite, and AI-derived data.",
        "sort_order": 120,
        "body": """\
# Data Use Policy

Last updated: 26 July 2026

This Data Use Policy explains how operational and environmental data is used on
the Aranyix platform, in addition to our Privacy Policy.

## 1. Categories of data

- Field evidence: GPS points, photos, species notes, survival surveys
- Project and compliance records: planting standards, violations, checklists
- Derived analytics: carbon estimates, health scores, satellite NDVI summaries
- Organization metadata: members, roles, program enrollments

## 2. Purpose of processing

Data is used to operate MRV workflows: register plantings, monitor sites,
prepare audit evidence, and support organization reporting. AI and satellite
features process submitted inputs to generate insights; those insights are
estimates unless independently verified.

## 3. Organization control

Within a professional workspace, organization administrators control which
members can view or edit project data. Platform administrators may access data
as needed for support, security, and platform operations, subject to access
controls and audit logging.

## 4. Exports and sharing

When you export MRV reports, evidence bundles, or create public verification
links, you are responsible for choosing appropriate recipients and for any
claims made externally using those exports.

## 5. Not a carbon registry

Aranyix does not submit projects to Verra, Gold Standard, or other registries on
your behalf unless a separate written agreement says otherwise. Credit ledgers
inside the product are internal accounting tools.

## 6. Retention and deletion

Project data is retained while the organization remains active. Suspended
organizations may lose interactive access while data is retained for recovery or
legal reasons. Requests to delete organization data can be submitted to platform
support and will be handled subject to legal retention requirements.

## 7. Changes

We may update this Policy; the "Last updated" date will change when we do.

This document is a platform template and should be reviewed by your counsel
before production use.
""",
    },
]


def legal_page_titles() -> dict[str, str]:
    return {p["slug"]: p["title"] for p in LEGAL_PAGES_DEFAULT}
