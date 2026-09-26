"""HTML transactional email templates for Aranyix."""

from __future__ import annotations

from html import escape

OTP_EXPIRY_MINUTES = 10
INVITE_EXPIRY_DAYS = 14

_BRAND_COLOR = "#1B5E3B"
_BRAND_ACCENT = "#2E7D52"
_MUTED = "#5F6B7A"
_BG = "#F4F7F5"
_CARD = "#FFFFFF"


def _base_layout(*, title: str, preheader: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:{_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1F24;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{_BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:{_CARD};border-radius:12px;border:1px solid #E3E8E5;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <div style="font-size:22px;font-weight:700;color:{_BRAND_COLOR};letter-spacing:0.2px;">Aranyix</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;font-size:15px;line-height:1.6;color:#24313A;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;font-size:12px;line-height:1.5;color:{_MUTED};">
              This is an automated message from Aranyix. Please do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _otp_block(code: str) -> str:
    return (
        f'<div style="margin:20px 0;padding:16px 20px;background:#F0F7F3;border-radius:8px;'
        f'text-align:center;font-size:28px;font-weight:700;letter-spacing:6px;color:{_BRAND_COLOR};">'
        f"{escape(code)}</div>"
    )


def _button(label: str, url: str) -> str:
    return (
        f'<p style="margin:24px 0;"><a href="{escape(url)}" '
        f'style="display:inline-block;padding:12px 22px;background:{_BRAND_ACCENT};color:#FFFFFF;'
        f'text-decoration:none;border-radius:8px;font-weight:600;">{escape(label)}</a></p>'
    )


def verification_otp_email(*, code: str) -> tuple[str, str, str]:
    subject = "Verify your Aranyix email"
    preheader = f"Your verification code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes."
    text = (
        f"Your Aranyix email verification code is {code}.\n\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes. "
        "If you did not request this, you can ignore this email."
    )
    body = (
        "<h1 style=\"margin:0 0 12px 0;font-size:20px;color:#1A1F24;\">Verify your email</h1>"
        "<p>Use this code to complete your Aranyix registration:</p>"
        f"{_otp_block(code)}"
        f"<p style=\"color:{_MUTED};\">This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>. "
        "If you did not start registration, you can safely ignore this email.</p>"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


def login_otp_email(*, code: str) -> tuple[str, str, str]:
    subject = "Your Aranyix sign-in code"
    preheader = f"Your sign-in code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes."
    text = (
        f"Your Aranyix sign-in code is {code}.\n\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes. "
        "If you did not request this, you can ignore this email."
    )
    body = (
        "<h1 style=\"margin:0 0 12px 0;font-size:20px;color:#1A1F24;\">Sign in to Aranyix</h1>"
        "<p>Use this one-time code to sign in:</p>"
        f"{_otp_block(code)}"
        f"<p style=\"color:{_MUTED};\">This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>. "
        "If you did not try to sign in, change your password and contact support.</p>"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


def password_reset_email(*, code: str) -> tuple[str, str, str]:
    subject = "Reset your Aranyix password"
    preheader = f"Your password reset code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes."
    text = (
        f"Your Aranyix password reset code is {code}.\n\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes. "
        "If you did not request a password reset, you can ignore this email."
    )
    body = (
        "<h1 style=\"margin:0 0 12px 0;font-size:20px;color:#1A1F24;\">Reset your password</h1>"
        "<p>Use this code to reset your Aranyix password:</p>"
        f"{_otp_block(code)}"
        f"<p style=\"color:{_MUTED};\">This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>. "
        "If you did not request a reset, ignore this email and your password will stay unchanged.</p>"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


def organization_invitation_email(
    *,
    full_name: str,
    org_name: str,
    org_role: str,
    invite_link: str,
) -> tuple[str, str, str]:
    role_label = org_role.replace("_", " ").title()
    subject = f"Join {org_name} on Aranyix"
    preheader = f"You have been invited to join {org_name} as {role_label}."
    text = (
        f"Hello {full_name},\n\n"
        f"You have been invited to join {org_name} on Aranyix as {role_label}.\n\n"
        f"Accept your invitation:\n{invite_link}\n\n"
        f"This link expires in {INVITE_EXPIRY_DAYS} days. "
        "If you did not expect this invite, you can ignore this email."
    )
    body = (
        f"<p>Hello {escape(full_name)},</p>"
        f"<p>You have been invited to join <strong>{escape(org_name)}</strong> on Aranyix "
        f"as <strong>{escape(role_label)}</strong>.</p>"
        f"{_button('Accept invitation', invite_link)}"
        f"<p style=\"color:{_MUTED};\">Or copy this link:<br/>"
        f'<a href="{escape(invite_link)}" style="color:{_BRAND_ACCENT};word-break:break-all;">'
        f"{escape(invite_link)}</a></p>"
        f"<p style=\"color:{_MUTED};\">This link expires in <strong>{INVITE_EXPIRY_DAYS} days</strong>. "
        "If you did not expect this invitation, you can ignore this email.</p>"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


def security_notification_email(*, title: str, message: str) -> tuple[str, str, str]:
    subject = title
    preheader = message[:120]
    text = f"{title}\n\n{message}"
    body = (
        f"<h1 style=\"margin:0 0 12px 0;font-size:20px;color:#1A1F24;\">{escape(title)}</h1>"
        f"<p>{escape(message)}</p>"
        f"<p style=\"color:{_MUTED};\">If you did not expect this notification, review your account "
        "security settings and contact your administrator.</p>"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


def program_access_admin_email(
    *,
    applicant_name: str,
    applicant_email: str,
    program_name: str,
    organization_name: str | None,
    queue_url: str,
) -> tuple[str, str, str]:
    subject = f"New program access request — {program_name}"
    org_line = f"Organization: {organization_name}\n" if organization_name else ""
    preheader = f"{applicant_name} requested access to {program_name}."
    text = (
        "A new professional program access request is waiting for review on Aranyix.\n\n"
        f"Applicant: {applicant_name} ({applicant_email})\n"
        f"Program: {program_name}\n"
        f"{org_line}\n"
        f"Review the queue:\n{queue_url}\n"
    )
    org_html = (
        f"<p><strong>Organization:</strong> {escape(organization_name)}</p>"
        if organization_name
        else ""
    )
    body = (
        "<h1 style=\"margin:0 0 12px 0;font-size:20px;color:#1A1F24;\">Program access request</h1>"
        "<p>A new professional program access request is waiting for review.</p>"
        f"<p><strong>Applicant:</strong> {escape(applicant_name)} "
        f"({escape(applicant_email)})</p>"
        f"<p><strong>Program:</strong> {escape(program_name)}</p>"
        f"{org_html}"
        f"{_button('Review request', queue_url)}"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


def program_access_decision_email(
    *,
    applicant_name: str,
    program_name: str,
    action: str,
    admin_note: str | None,
    dashboard_url: str,
    pending_url: str,
) -> tuple[str, str, str]:
    if action == "approve":
        subject = f"Your {program_name} access was approved"
        preheader = f"Your request for {program_name} on Aranyix was approved."
        text = (
            f"Hello {applicant_name},\n\n"
            f"Your request for the {program_name} program on Aranyix has been approved.\n\n"
            f"Sign in to get started:\n{dashboard_url}\n"
        )
        body = (
            f"<p>Hello {escape(applicant_name)},</p>"
            f"<p>Your request for the <strong>{escape(program_name)}</strong> program "
            "on Aranyix has been <strong>approved</strong>.</p>"
            f"{_button('Go to Aranyix', dashboard_url)}"
        )
    else:
        subject = f"Update on your {program_name} access request"
        preheader = f"Your request for {program_name} was not approved."
        text = (
            f"Hello {applicant_name},\n\n"
            f"Your request for the {program_name} program was not approved at this time.\n"
        )
        if admin_note:
            text += f"\nNote from reviewer:\n{admin_note}\n"
        text += f"\nView status:\n{pending_url}\n"
        note_html = (
            f"<p><strong>Note from reviewer:</strong><br/>{escape(admin_note)}</p>"
            if admin_note
            else ""
        )
        body = (
            f"<p>Hello {escape(applicant_name)},</p>"
            f"<p>Your request for the <strong>{escape(program_name)}</strong> program "
            "was not approved at this time.</p>"
            f"{note_html}"
            f"{_button('View status', pending_url)}"
        )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)


ORGANIZATION_TYPE_LABELS = {
    "corporate_esg": "Corporate ESG",
    "government": "Government / public sector",
    "mining": "Mining & industrial reclamation",
    "ngo": "NGO / community",
    "international": "International donor / verifier",
    "other": "Other",
}

LAND_HECTARES_LABELS = {
    "under_100": "Under 100 ha",
    "100_1000": "100 - 1,000 ha",
    "1000_10000": "1,000 - 10,000 ha",
    "over_10000": "10,000+ ha",
}

SITE_COUNT_LABELS = {
    "1": "1 site",
    "2_10": "2 - 10 sites",
    "11_50": "11 - 50 sites",
    "50_plus": "50+ sites",
}


def _label(mapping: dict[str, str], key: str) -> str:
    return mapping.get(key, key.replace("_", " ").title())


def contact_inquiry_email(
    *,
    full_name: str,
    email: str,
    phone: str,
    organization: str,
    organization_type: str,
    state: str,
    land_hectares_band: str,
    site_count_band: str,
    message: str,
) -> tuple[str, str, str]:
    org_type = _label(ORGANIZATION_TYPE_LABELS, organization_type)
    hectares = _label(LAND_HECTARES_LABELS, land_hectares_band)
    sites = _label(SITE_COUNT_LABELS, site_count_band)
    subject = f"Aranyix contact inquiry - {organization}"
    preheader = f"New inquiry from {full_name} at {organization}."
    text = (
        "New contact inquiry from the Aranyix website\n\n"
        f"Name: {full_name}\n"
        f"Email: {email}\n"
        f"Phone: {phone}\n"
        f"Organization: {organization}\n"
        f"Organization type: {org_type}\n"
        f"State / region: {state}\n"
        f"Land under management: {hectares}\n"
        f"Number of sites: {sites}\n\n"
        f"Message:\n{message}\n"
    )
    body = (
        "<h1 style=\"margin:0 0 12px 0;font-size:20px;color:#1A1F24;\">New contact inquiry</h1>"
        f"<p><strong>Name:</strong> {escape(full_name)}</p>"
        f"<p><strong>Email:</strong> {escape(email)}</p>"
        f"<p><strong>Phone:</strong> {escape(phone)}</p>"
        f"<p><strong>Organization:</strong> {escape(organization)}</p>"
        f"<p><strong>Organization type:</strong> {escape(org_type)}</p>"
        f"<p><strong>State / region:</strong> {escape(state)}</p>"
        f"<p><strong>Land under management:</strong> {escape(hectares)}</p>"
        f"<p><strong>Number of sites:</strong> {escape(sites)}</p>"
        f"<p><strong>Message:</strong></p>"
        f"<p style=\"white-space:pre-wrap;\">{escape(message)}</p>"
    )
    return subject, text, _base_layout(title=subject, preheader=preheader, body_html=body)
