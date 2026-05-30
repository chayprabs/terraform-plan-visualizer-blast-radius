import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} handles your data locally in the browser.`,
  alternates: { canonical: getAbsoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Last updated: May 30, 2026
        </p>

        <div className="text-foreground mt-8 space-y-6 text-sm leading-7">
          <section>
            <h2 className="text-lg font-semibold">Local-first processing</h2>
            <p className="text-muted-foreground mt-2">
              {siteConfig.name} parses Terraform plan JSON entirely in your web
              browser. Plan contents are not uploaded to our servers for
              analysis. Network requests are limited to loading the application
              itself (HTML, JavaScript, fonts, and static assets).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Optional local storage</h2>
            <p className="text-muted-foreground mt-2">
              If you enable local history, a redacted copy of your plan may be
              stored in your browser&apos;s IndexedDB on your device. You can
              clear this history at any time from the workspace. Share-safe
              links encode reviewer UI state (filters, selection) in the URL
              fragment—they do not embed your plan JSON.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Exports and sharing</h2>
            <p className="text-muted-foreground mt-2">
              When you export reports or copy text, you control where that
              content goes. Review exports before posting to tickets, chat, or
              pull requests—even with redaction enabled, verify sensitive values
              are removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Hosting and logs</h2>
            <p className="text-muted-foreground mt-2">
              The site may be hosted on Vercel or similar infrastructure. Standard
              web server logs (IP address, user agent, requested paths) may be
              collected by the host for security and reliability. Those logs do
              not include your Terraform plan contents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Third-party fonts</h2>
            <p className="text-muted-foreground mt-2">
              Typography may be served via Google Fonts through Next.js font
              optimization. See Google&apos;s privacy policy for how they process
              font requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="text-muted-foreground mt-2">
              Questions about this policy can be directed via the repository
              issues page on{" "}
              <a
                href={siteConfig.links.repository}
                className="text-brand underline"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              .
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
