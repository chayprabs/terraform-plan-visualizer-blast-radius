# Adding an Authos tool

1. Add an entry to `src/lib/authos/tools-registry.ts` with `status: "available"`.
2. Create `src/features/<tool-id>/` with domain logic and a root `<Tool>()` component.
3. Add `src/app/tools/<route>/page.tsx` with metadata using `getSiteUrl()` / `getAbsoluteUrl()`.
4. Add unit tests under `tests/unit/<tool-id>/` and e2e under `tests/e2e/`.
5. Register the route in `src/app/sitemap.ts` (via `authosTools`).

Keep analysis local-first. Document inputs, limits, and privacy behavior in the tool FAQ.
