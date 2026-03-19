# Appendix A: Shared Technical Foundations

- **Programming languages:** TypeScript is used for both backend (Node.js) and frontend (React/Next.js) to ensure type safety and shared interfaces. Python may be used for scripts and tooling.
- **Frameworks and libraries:**
  - **Backend:** Express.js or NestJS for HTTP server and API structure; PostgreSQL for relational data; an ORM (Prisma/TypeORM) for data access; Redis for caching; a future search service for discovery features; multer or similar for file uploads.
  - **Frontend:** Next.js for server‑rendered React, leveraging its routing and data fetching. Tailwind CSS or a custom design token system for styling. Redux or context API for state management as needed.
  - **UI Kit:** A component library built using the design system tokens. Could leverage headless UI and shadcn/ui for accessible primitives.
- **Runtime topology:** Run the web server and API server as the core self-hosted application stack, adding database, search, and object storage services only when the implemented feature set requires them.
- **CI/CD:** GitHub Actions (or similar) for linting, testing and building release artifacts on each commit. Optional deployment workflows may publish packaged builds for self-hosted installs.
- **Testing:** Jest or Vitest for unit tests; Cypress or Playwright for end‑to‑end tests; supertest for integration tests.
- **Version control:** Git with a main branch and feature branches. Semantic versioning for releases. Conventional commits for commit messages.
- **Internationalisation:** Although optional in v1, the codebase should be prepared for localisation by abstracting strings into resource files.
