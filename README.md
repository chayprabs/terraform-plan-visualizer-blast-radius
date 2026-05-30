# Authos

Browser-first developer tools for local, trustworthy infrastructure review.

## Tools

| Tool | Route |
|------|--------|
| Terraform Plan Visualizer | `/` (legacy `/tools/terraform-plan-visualizer` redirects home) |
| Secrets Redactor | `/tools/secrets-redactor` |
| GitHub Actions Workflow Analyzer | `/tools/github-actions-analyzer` |
| Kubernetes Manifest Analyzer | `/tools/kubernetes-manifest-analyzer` |
| Terraform HCL Linter | `/tools/terraform-hcl-linter` |

All core analysis runs in your browser. There is no authentication and no backend API for processing sensitive inputs.

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

CI runs lint, typecheck, tests, e2e, and build on every push to `main`. Connect the repository to Vercel (or set `VERCEL_*` secrets for the optional deploy workflow).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/ADDING_A_TOOL.md](docs/ADDING_A_TOOL.md)

## Repository

https://github.com/chayprabs/terraform-plan-visualizer-blast-radius
