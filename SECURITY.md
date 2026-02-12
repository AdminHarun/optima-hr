# Security Policy

## 🛡️ Optima HR Security Commitment
At **Optima HR**, the security of our employees, applicants, and corporate data is our top priority. We follow industry-standard security practices to protect sensitive HR information.

---

## 1. Supported Versions
We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes (Main Branch) |
| < 1.0.0 | ❌ No              |

---

## 2. Reporting a Vulnerability
**Please do not open public issues for security vulnerabilities.** This could expose sensitive data to malicious actors.

If you discover a security hole, please report it through one of the following secure channels:

1.  **GitHub Private Vulnerability Reporting:** Go to the [Security tab](https://github.com/AdminHarun/optima-hr/security) of this repository and select "Report a vulnerability".
2.  **Email:** Send an encrypted report to `security@optima-hr.net` (or your personal email here).

### What to include in your report:
* A brief description of the vulnerability (e.g., XSS, SQLi, IDOR).
* Steps to reproduce the issue (Proof of Concept).
* Potential impact of the vulnerability.

---

## 3. Disclosure Policy
Once a report is received, we follow these steps:
1.  **Acknowledge:** We will confirm receipt within **48 hours**.
2.  **Verify:** We will analyze the impact and verify the bug.
3.  **Fix:** We will release a patch as soon as possible (typically within 7-14 days).
4.  **Credit:** After a fix is deployed, we will (with your permission) credit you for your contribution.

---

## 4. Security Engineering Standards
Optima HR is built with the following security-first principles:

* **Authentication:** Robust JWT (JSON Web Token) handling for both Web and Desktop versions.
* **Encryption:** Sensitive data like passwords and PII (Personally Identifiable Information) are encrypted using **BCrypt** and **AES-256**.
* **Socket Security:** WebSocket connections are protected via **STOMP Interceptors** to prevent unauthorized message interception.
* **Desktop Integrity:** Electron builds are signed to ensure application integrity (Production stage).

---

## 5. Security Tools Used
We use the following automated tools to keep Optima HR safe:
* **Dependabot:** Automated dependency updates.
* **CodeQL:** Semantic code analysis to find vulnerabilities.

---
*Thank you for helping keep Optima HR safe!*
