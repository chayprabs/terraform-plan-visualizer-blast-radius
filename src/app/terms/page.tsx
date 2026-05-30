import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms of use for ${siteConfig.name}.`,
  alternates: { canonical: getAbsoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Last updated: May 30, 2026
        </p>

        <div className="text-foreground mt-8 space-y-6 text-sm leading-7">
          <section>
            <h2 className="text-lg font-semibold">Acceptance</h2>
            <p className="text-muted-foreground mt-2">
              By using {siteConfig.name}, you agree to these terms. If you do not
              agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Review aid only</h2>
            <p className="text-muted-foreground mt-2">
              This tool is an assistant for human review of Terraform plans. It is
              not a policy engine, security scanner with guarantees, or a
              substitute for your organization&apos;s change-management process.
              Findings are heuristic and may be incomplete or incorrect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Your responsibility</h2>
            <p className="text-muted-foreground mt-2">
              You are solely responsible for infrastructure changes, compliance,
              and verifying exports before sharing. Always run official{" "}
              <code className="text-foreground font-mono text-xs">
                terraform plan
              </code>{" "}
              and approval workflows required by your team.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Disclaimer of warranties</h2>
            <p className="text-muted-foreground mt-2">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY
              KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Limitation of liability</h2>
            <p className="text-muted-foreground mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE AUTHORS AND
              CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
              DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Changes</h2>
            <p className="text-muted-foreground mt-2">
              These terms may be updated from time to time. Continued use after
              changes constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>

        <p className="text-muted-foreground mt-10 text-sm">
          <Link href="/" className="text-brand hover:underline">
            ← Back to {siteConfig.name}
          </Link>
        </p>
      </article>
    </AppShell>
  );
}
