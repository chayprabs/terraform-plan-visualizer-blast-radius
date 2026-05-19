import { afterEach, describe, expect, it } from "vitest";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL when configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    delete process.env.VERCEL_URL;

    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("falls back to VERCEL_URL when NEXT_PUBLIC_SITE_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "my-app.vercel.app";

    expect(getSiteUrl()).toBe("https://my-app.vercel.app");
  });

  it("uses localhost when no public site URL is configured outside production", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("getAbsoluteUrl", () => {
  it("joins paths with a leading slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

    expect(getAbsoluteUrl("tools/terraform-plan-visualizer")).toBe(
      "https://example.com/tools/terraform-plan-visualizer",
    );
    expect(getAbsoluteUrl("/tools/terraform-plan-visualizer")).toBe(
      "https://example.com/tools/terraform-plan-visualizer",
    );
  });
});
