# Master Build Prompt for Coding Agent

This document instructs a coding agent on how to begin building Book Worm based on the specifications provided.

## Scope of the Agent
The agent’s primary job is to implement the technical foundation and features described in the Build Bible and supporting documents. The agent should not invent product requirements. All decisions must align with:

- The Product Requirements Document (PRD).
- The Domain Model & Schema specification.
- The Permissions and Visibility Matrix.
- The Implementation Plan and phased sequencing.
- The Design System Token specification.
- The Search, Continuity, Import/Export and API specifications.

## Operating Guidelines
1. **Read Documents:** Before writing code, read the relevant specifications in the `documentation` folder. Understand what entities and relationships need to be built, what endpoints to expose and what UI components are required.
2. **Stay Within Phase:** Only implement features assigned to the current phase (e.g. dev‑use, MVP, Beta, v1). Do not progress to later phases without instruction.
3. **Follow Coding Standards:** Use TypeScript with strict typing. Adhere to ESLint rules, Prettier formatting and naming conventions. Use conventional commits.
4. **Write Tests:** For each new module, write unit tests and, where applicable, integration or E2E tests. Tests must run in the CI pipeline.
5. **Re‑use Components:** Use the shared design system and UI kit. Do not create new UI elements without checking for existing tokens and components.
6. **Respect Permissions:** Ensure that API endpoints check user roles and filter data accordingly. Do not leak restricted or private data.
7. **Document Code:** Write docstrings and comments. Update any relevant documents if the implementation deviates from assumptions.
8. **Trigger Feedback:** If the specification is ambiguous or missing information, raise an issue or ask for human clarification before proceeding.
9. **Contribute Back:** When adding new reusable utilities or patterns, document them so the next phase can build upon your work.
