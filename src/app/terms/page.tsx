import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms of use for ${siteConfig.name}.`,
  alternates: {
    canonical: getAbsoluteUrl(siteConfig.links.terms),
  },
};

export default function TermsPage() {
  const effectiveDate = "May 30, 2026";

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">
        Terms of Use
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Effective date: {effectiveDate}
      </p>

      <div className="text-foreground mt-10 max-w-3xl space-y-8 text-base leading-8">
        <section>
          <h2 className="text-xl font-semibold">Agreement</h2>
          <p className="text-muted-foreground mt-3">
            By accessing or using {siteConfig.name}, you agree to these Terms of
            Use. If you do not agree, do not use the site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Service description</h2>
          <p className="text-muted-foreground mt-3">
            The site provides client-side tools to help you review Terraform plan
            JSON, including change summaries, risk findings, dependency graphs,
            and exportable reports. The software is provided for informational
            review support. It is not a substitute for your own change
            management, security review, or approval processes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">No warranty</h2>
          <p className="text-muted-foreground mt-3">
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
            AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
            IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            AND NON-INFRINGEMENT. We do not warrant that risk findings, blast
            radius views, cost estimates, or exports are complete, accurate, or
            suitable for production decisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Limitation of liability</h2>
          <p className="text-muted-foreground mt-3">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE AUTHORS AND CONTRIBUTORS
            WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
            GOODWILL, ARISING FROM YOUR USE OF THE SERVICE, EVEN IF ADVISED OF
            THE POSSIBILITY OF SUCH DAMAGES.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Your responsibilities</h2>
          <p className="text-muted-foreground mt-3">
            You are responsible for the Terraform plans and exports you load
            into the tool, for complying with your organization&apos;s security
            policies, and for verifying changes before apply. Do not load
            secrets into shared machines or share unredacted exports in public
            channels.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Acceptable use</h2>
          <p className="text-muted-foreground mt-3">
            You may not attempt to disrupt the site, probe systems you do not
            own, or use the service in violation of applicable law. Automated
            scraping that degrades availability for other users is not permitted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Open source</h2>
          <p className="text-muted-foreground mt-3">
            Source code is available under the license published in the
            repository. Third-party dependencies are subject to their own
            licenses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Changes</h2>
          <p className="text-muted-foreground mt-3">
            We may modify these terms. Continued use after updates constitutes
            acceptance of the revised terms shown on this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground mt-3">
            Report issues or questions through{" "}
            <a
              href={siteConfig.links.repository}
              className="text-foreground underline"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            .
          </p>
        </section>

        <p className="text-muted-foreground text-sm">
          See also our{" "}
          <Link
            href={siteConfig.links.privacy}
            className="text-foreground underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}
