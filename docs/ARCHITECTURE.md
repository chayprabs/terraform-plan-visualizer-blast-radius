# Authos architecture

Authos is a single Next.js 16 application that ships multiple local-first browser tools under `/tools/*`.

## Principles

- **No backend analysis API**: Terraform plans, YAML, HCL, and logs are parsed in the browser (or via a same-origin API route only where WASM cannot run in the client, e.g. HCL parsing).
- **Shared privacy pipeline**: Secret detection and redaction live under `src/features/terraform-plan/privacy/` and are reused by export and secrets tools.
- **Tool registry**: `src/lib/authos/tools-registry.ts` is the source of truth for routes, navigation, and sitemap entries.

## Layout

```
src/app/                    Next.js routes
src/features/<tool>/        Tool-specific domain, UI, tests
src/lib/authos/             Cross-tool registry and shared utilities
src/components/             App shell, home, layout
```

## Terraform Plan Visualizer

1. Input → Web Worker (`terraformPlanWorker.ts`) → parse → validate → normalize → risk evaluation
2. UI state: React reducer + URL query sync (`urlState.ts`)
3. Optional IndexedDB history with redacted plan JSON (`localPreferences.ts`)

## Adding a tool

See [ADDING_A_TOOL.md](./ADDING_A_TOOL.md).
