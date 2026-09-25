import { LegalDocumentPage } from "@/components/marketing/legal-document";
import { getLegalDocument, legalPageMetadata } from "@/lib/content/legal";

export const metadata = legalPageMetadata("terms");

export default function TermsPage() {
  return <LegalDocumentPage document={getLegalDocument("terms")} />;
}
