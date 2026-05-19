export const riskyWorkflowYaml = `name: Risky fork workflow
on:
  pull_request_target:
    types:
      - opened
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      TOKEN: \${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@main
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
`;

export const safeWorkflowYaml = `name: Safe CI
on:
  push:
    branches:
      - main
  pull_request:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - run: npm test
`;
