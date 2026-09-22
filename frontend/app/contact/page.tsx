import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Contact us</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-emerald-100/75">
            Tell us about your plantation programme - sites, hectares, and what you need from
            monitoring, MRV, or audit-ready reporting. Our team will follow up by email.
          </p>
        </div>
        <ContactForm />
      </div>
    </MarketingShell>
  );
}
