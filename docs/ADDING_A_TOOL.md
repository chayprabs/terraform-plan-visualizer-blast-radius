# Extending the codebase

This repository is focused on the Terraform Plan Visualizer. Additional experimental tools may live under `src/app/tools/*` for development, but the production UI is the home-page workspace only.

To extend the main product:

1. Add domain logic under `src/features/terraform-plan/`.
2. Wire UI in `WorkspaceShell` or dedicated panels.
3. Add unit tests beside the feature (`tests/unit/terraform-plan/`).
4. Add or update Playwright flows in `tests/e2e/terraform-plan-*.spec.ts`.
