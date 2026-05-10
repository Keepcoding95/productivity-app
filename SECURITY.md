# Security

## Reporting a vulnerability

Please report security issues **privately** using [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) for this repository so they can be addressed before public disclosure.

Please do **not** open a public issue for an undisclosed vulnerability.

## Dependency hygiene

Run these periodically (especially before deploying):

```bash
composer audit
npm audit
```

The application stack is Laravel (PHP) and Vue/Vite (JavaScript); keep framework and runtime patches current.
