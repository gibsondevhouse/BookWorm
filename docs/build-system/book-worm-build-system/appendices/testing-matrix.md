# Appendix E: Testing Matrix

Testing should occur across multiple layers to ensure stability and prevent regressions:

| Test Type                     | Description                                                     | Tools                          |
|-------------------------------|-----------------------------------------------------------------|--------------------------------|
| Unit Tests                    | Verify individual functions, models and components.            | Jest, Vitest                   |
| Integration Tests             | Test interactions between modules (e.g. API routes and database). | supertest, Vitest             |
| End‑to‑End (E2E) Tests        | Simulate user journeys through the UI and API.                 | Cypress, Playwright            |
| Continuity Rule Tests         | Check that continuity validations detect issues correctly.      | Custom test harness, Vitest    |
| Permission & Role Tests       | Ensure API endpoints and UI respect the permission matrix.      | supertest, Playwright          |
| Accessibility Tests           | Run automated accessibility checks (WCAG).                     | axe-core, Lighthouse           |
| Performance Tests             | Measure API response times and page load performance.           | JMeter, Lighthouse             |
| Security Tests                | Static code analysis, dependency scanning and penetration tests.| Snyk, OWASP ZAP                |

Testing should be integrated into the CI pipeline. Each phase should increase coverage: dev‑use establishes unit tests; MVP adds integration and basic E2E; Beta expands tests to cover new features; v1 includes performance, accessibility and security tests.
