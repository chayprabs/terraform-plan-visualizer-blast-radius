# Security Policy

## Supported versions

Security fixes are applied to the latest release on the `main` branch.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report sensitive issues privately by opening a
[GitHub Security Advisory](https://github.com/chayprabs/terraform-plan-visualizer-blast-radius/security/advisories/new)
or contacting the maintainer through [chaitanyaprabuddha.com](https://chaitanyaprabuddha.com).

Include:

- A description of the issue and potential impact
- Steps to reproduce
- Affected routes, components, or dependencies (if known)

We aim to acknowledge reports within a few business days.

## Scope notes

- **Terraform plan content** is intended to be processed in the browser. Do not
  send production plan files to third parties when testing suspected issues.
- **Client-side storage** (local history, URL state) is under the user's
  control. Reports about data left on a shared machine are generally out of
  scope for server-side remediation.
- **Dependency vulnerabilities** should include the package name and version
  from `pnpm-lock.yaml` when possible.

## Safe harbor

We appreciate responsible disclosure and will work with reporters to understand
and address valid issues in the open-source codebase.
