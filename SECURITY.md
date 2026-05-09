# Security Policy

## Supported Versions

The public `main` branch is the supported version of this project.

## Reporting A Vulnerability

Please do not open a public issue for sensitive security reports. Instead, contact the maintainers privately through GitHub security advisories once the repository is published.

If GitHub private vulnerability reporting is not enabled yet, open a minimal issue that says a private security contact is needed, without including exploit details.

## Source Safety

This project ingests public official-source URLs. Do not add credentials, private files, unpublished materials, access tokens, cookies, or non-public government data to the repository.

## Dependency Safety

Before merging dependency changes, run:

```bash
npm run lint
npm run typecheck
npm run build
```
