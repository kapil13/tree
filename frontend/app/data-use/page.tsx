import { LegalDocumentPage } from "@/components/marketing/legal-document";
import { getLegalDocument, legalPageMetadata } from "@/lib/content/legal";

export const metadata = legalPageMetadata("data-use");

export default function DataUsePage() {
  return <LegalDocumentPage document={getLegalDocument("data-use")} />;
}
