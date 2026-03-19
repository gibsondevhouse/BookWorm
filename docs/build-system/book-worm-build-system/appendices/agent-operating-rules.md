# Appendix H: Agent Operating Rules

This document defines the rules under which automated coding agents may operate on the Book Worm project.

1. **Follow Specifications:** The agent must adhere strictly to the PRD, Domain Model, Permissions Matrix, Build Bible and other specifications in the `documentation` folder. Do not invent new features or data models unless explicitly instructed by a human maintainer.
2. **Read Before Write:** Before generating code or modifying files, the agent must read the relevant design documents and existing code to understand context. Avoid duplicating existing logic.
3. **Respect Phases:** Implement only tasks assigned to the current development phase. Do not commence Beta or v1 features while still in dev‑use or MVP unless approved.
4. **Maintain Tests:** Whenever creating new code, the agent must also add or update unit, integration or end‑to‑end tests to cover the new functionality.
5. **Lint and Format:** All code produced must pass linting and formatting checks defined in the repository. Fix issues automatically when possible.
6. **Avoid Sensitive Information:** The agent must not insert secrets, access tokens or proprietary information into the codebase. Environment variables should be placeholders and loaded from `.env` files.
7. **Commit Messages:** Use clear, conventional commit messages summarising what changed and why. Include references to specification documents or issues where appropriate.
8. **Pull Request Description:** When opening a PR, include a summary of the changes, why they are needed, how they align with the phase goals and any follow‑up tasks.
9. **Seek Review:** Automated changes must be reviewed and approved by a designated maintainer. The agent may not merge code without human review.
10. **Continuous Improvement:** If the agent encounters ambiguities or missing specifications, it should flag them for human clarification rather than guessing. Suggest improvements to documentation where confusion arises.
