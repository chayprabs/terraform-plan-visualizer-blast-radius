# Terraform Plan Visualizer

Paste or upload `terraform show -json` output to review resource changes, risk findings, dependency graphs, and blast-radius exports—entirely in your browser. Nothing is uploaded to a server.

## Features

- Plan summary dashboard with provider, module, and resource-type breakdowns
- Heuristic risk findings for destructive or sensitive changes
- Interactive dependency graph with blast-radius focus
- Privacy redaction for exports and optional local history (IndexedDB)
- PR-ready Markdown, HTML, and JSON exports

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- Vitest, Playwright, ESLint, Prettier

## Quick start

```bash
pnpm install
cp .env.example .env.local   # optional: set NEXT_PUBLIC_SITE_URL
pnpm dev
```

Open http://localhost:3000

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
pnpm build
```

## Configuration

`NEXT_PUBLIC_SITE_URL` — public origin for canonical URLs and Open Graph (see `.env.example`). On Vercel, `VERCEL_URL` is used when unset.

## Deployment

CI runs lint, typecheck, tests, e2e, and build on every push to `main`. Connect the repository to Vercel (or set `VERCEL_*` secrets and `ENABLE_VERCEL_DEPLOY=true` for the optional deploy workflow).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [Privacy Policy](https://github.com/chayprabs/terraform-plan-visualizer-blast-radius/blob/main/src/app/privacy/page.tsx) (live at `/privacy`)
- [Terms & Conditions](https://github.com/chayprabs/terraform-plan-visualizer-blast-radius/blob/main/src/app/terms/page.tsx) (live at `/terms`)

## License

MIT — see [LICENSE](LICENSE).

## Repository

https://github.com/chayprabs/terraform-plan-visualizer-blast-radius
