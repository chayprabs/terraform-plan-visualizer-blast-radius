import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${siteConfig.name}.`,
  alternates: {
    canonical: getAbsoluteUrl(siteConfig.links.privacy),
  },
};

export default function PrivacyPage() {
  const effectiveDate = "May 30, 2026";

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Effective date: {effectiveDate}
      </p>

      <div className="text-foreground mt-10 max-w-3xl space-y-8 text-base leading-8">
        <section>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-muted-foreground mt-3">
            {siteConfig.name} is a browser-first application. When you paste or
            upload a Terraform plan JSON file, parsing, risk analysis, graph
            layout, and exports run locally in your browser. We do not operate a
            backend API that receives your plan content for analysis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Information we do not collect</h2>
          <p className="text-muted-foreground mt-3">
            We do not require an account to use the visualizer. We do not ask
            you to sign in, and we do not intentionally collect Terraform plan
            contents, credentials, or infrastructure identifiers from your
            analysis session on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Local storage and URLs</h2>
          <p className="text-muted-foreground mt-3">
            Optional features may store preferences, redaction settings, or
            redacted plan history in your browser&apos;s local storage on your
            device. Shareable review links may encode viewer state in the page
            URL. That data stays under your control in the browser unless you
            choose to share the link. Clearing site data in your browser removes
            locally stored history and preferences.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Hosting and analytics</h2>
          <p className="text-muted-foreground mt-3">
            The static site and any serverless routes are hosted on
            infrastructure providers (for example Vercel) that may process
            standard web request metadata such as IP address, user agent, and
            requested path for delivery and security. We do not use that
            metadata to reconstruct your Terraform plan contents because those
            contents are not transmitted to us for analysis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Exports and sharing</h2>
          <p className="text-muted-foreground mt-3">
            When you download or copy Markdown, JSON, HTML, or other exports,
            you are responsible for where that material is stored or shared.
            Use the built-in redaction controls before exporting if your plan may
            contain secrets or sensitive values.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Children</h2>
          <p className="text-muted-foreground mt-3">
            The service is intended for professional infrastructure review and is
            not directed to children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Changes</h2>
          <p className="text-muted-foreground mt-3">
            We may update this policy as the product evolves. Material changes
            will be reflected on this page with an updated effective date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground mt-3">
            Questions about privacy can be sent via the repository issue tracker
            at{" "}
            <a
              href={siteConfig.links.repository}
              className="text-foreground underline"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>{" "}
            or through the contact options listed on{" "}
            <a
              href={siteConfig.links.website}
              className="text-foreground underline"
              rel="noreferrer"
              target="_blank"
            >
              chaitanyaprabuddha.com
            </a>
            .
          </p>
        </section>

        <p className="text-muted-foreground text-sm">
          See also our{" "}
          <Link href={siteConfig.links.terms} className="text-foreground underline">
            Terms of Use
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}
