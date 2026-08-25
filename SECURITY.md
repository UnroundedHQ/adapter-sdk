# Security

Report privately via [private vulnerability reporting](https://github.com/UnroundedHQ/adapter-sdk/security/advisories/new).
Do not open a public issue. We aim to acknowledge within 5 working days.

This package is types and one pure function; the realistic risk is supply chain. A
malicious adapter published against this interface is a concern for whoever installs
it, not a vulnerability in this repo — but tell us anyway and we will warn people.

**A published release tag is never moved.** If a release is wrong we cut a new version.

## What is not a vulnerability

- An adapter that reports wrong data. That is the adapter's bug.
- Findings from an automated scanner with no demonstrated exploit path.
