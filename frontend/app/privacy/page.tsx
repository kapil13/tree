import { LegalDocumentPage } from "@/components/marketing/legal-document";
import { getLegalDocument, legalPageMetadata } from "@/lib/content/legal";

export const metadata = legalPageMetadata("privacy");

export default function PrivacyPage() {
  return <LegalDocumentPage document={getLegalDocument("privacy")} />;
}
