# Security Policy

## Supported Versions

Currently, the only version actively supported for security updates is the mainline major release:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

Because `g-coder` is a high-privilege CLI tool capable of autonomous OS execution, we take security extremely seriously. 

**Do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a 0-day exploit, privilege escalation flaw, or remote code execution (RCE) vector within the architecture, please report it privately:

1. Email the core author immediately at the contact provided in their GitHub profile.
2. Provide a detailed Proof of Concept (PoC) showing how the autonomous engines can be hijacked.
3. We aim to acknowledge receipt of vulnerabilities within 48 hours and will issue a CVE patch release (`v1.x.x`) swiftly.

## Sandbox Protections
The `SelfEvolvingEngine` utilizes a local `.g-coder-capabilities` sandbox. Please do not commit this folder to public repositories if it contains sensitive dynamically generated scripts.
