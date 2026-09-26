import { ContactPageContent } from "@/components/marketing/contact-page-content";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Contact us",
  description:
    "Contact Aranyix for plantation MRV pilots, demos, and enterprise rollouts — CSR, mining green belts, CAMPA programmes, and BRSR evidence.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingShell>
      <ContactPageContent />
    </MarketingShell>
  );
}
