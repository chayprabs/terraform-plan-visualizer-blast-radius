# Architecture

Terraform Plan Visualizer is a Next.js 16 application that parses Terraform plan JSON locally in the browser.

## Principles

- **No backend analysis API**: Plans are parsed in a Web Worker (with main-thread fallback).
- **Shared privacy pipeline**: Secret detection and redaction live under `src/lib/shared/privacy/`.
- **Single product surface**: The home page (`/`) is the workspace; `/tools/terraform-plan-visualizer` redirects to `/`.

## Layout

```
src/app/                    Next.js routes (home, privacy, terms)
src/features/terraform-plan/ Domain, UI, worker, tests
src/lib/shared/             Cross-cutting utilities (privacy, export, worker factory)
src/components/layout/      Site header, SEO intro bar, legal footer
```

## Analysis pipeline

1. Input → Web Worker (`terraformPlanWorker.ts`) → parse → validate → normalize → risk evaluation
2. UI state: React reducer + URL query sync (`urlState.ts`)
3. Optional IndexedDB history with redacted plan JSON (`localPreferences.ts`)

## Adding capabilities

Extend risk rules in `src/features/terraform-plan/risk/`, graph logic in `graph/`, and export builders in `export/`. Keep parsing and normalization pure for unit tests.
