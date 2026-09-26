import { serializeJsonLd } from "@/lib/seo/structured-data";
import { DEFAULT_DESCRIPTION, HONESTY_DISCLAIMER, SITE_URL } from "@/lib/seo/site";
import type { SolutionFaq } from "@/lib/seo/solution-pages";

export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function homePageJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Aranyix",
      alternateName: "Araynix",
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      parentOrganization: {
        "@type": "Organization",
        name: "Axentis Technologies Pvt Ltd",
        url: "https://www.axentis.tech",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Aranyix",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      url: SITE_URL,
      description:
        "Geo-tagged plantation MRV, survival tracking, satellite health fusion, and audit-prep exports for CSR, mining green belts, and government afforestation programmes in India.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "90-day pilots available — contact for programme pricing",
      },
      featureList: [
        "Geo-tagged tree registration",
        "Satellite NDVI and SAR fusion",
        "Survival and mortality tracking",
        "Audit-prep BRSR and scheme exports",
      ],
      disclaimer: HONESTY_DISCLAIMER,
    },
  ];
}

export function faqPageJsonLd(faqs: SolutionFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
