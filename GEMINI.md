# Gemini Code Assistant Context: Book Worm

This document provides a comprehensive overview of the Book Worm project, intended to be used as instructional context for the Gemini Code Assistant.

## Project Overview

Book Worm is a solo-author fiction writing studio designed to help writers manage their creative projects. It provides tools for maintaining world consistency, tracking characters, and managing canon decisions.

The project is a full-stack application built as a TypeScript monorepo using `pnpm` workspaces.

### Architecture

*   **Monorepo**: The project is organized as a `pnpm` workspace, with individual packages located in the `apps/` directory.
*   **Backend API (`apps/api`)**: A Node.js application built with Express.js and TypeScript. It handles all business logic, data persistence, and exposes a RESTful API.
*   **Frontend Web (`apps/web`)**: A web application built with Next.js, React, and Tailwind CSS. It provides the user interface for the writing studio.
*   **Database**: The application uses a PostgreSQL database, with the schema managed by Prisma. The Prisma schema is located at `prisma/schema.prisma` and defines a comprehensive data model for users, entities (characters, factions, etc.), manuscripts, releases, and various workflow-related tables for comments, proposals, and reviews.

### Key Technologies

*   **Backend**: Node.js, Express.js, TypeScript, Prisma, Zod
*   **Frontend**: Next.js, React, TypeScript, Tailwind CSS
*   **Database**: PostgreSQL
*   **Tooling**: `pnpm`, `tsx`, `eslint`, `prettier`, Node.js test runner

## Building and Running

The `README.md` file provides detailed setup instructions. The following are the most common commands for development.

### Core Commands

*   **Install dependencies**:
    ```bash
    pnpm install
    ```
*   **Run in development mode**: (starts both API and web apps)
    ```bash
    pnpm dev
    ```
*   **Build all packages**:
    ```bash
    pnpm build
    ```
*   **Run tests**:
    ```bash
    pnpm test
    ```
*   **Run linter**:
    ```bash
    pnpm lint
    ```
*   **Run type-checking**:
    ```bash
    pnpm type-check
    ```
*   **Format code**:
    ```bash
    pnpm format
    ```

### Database Commands

*   **Generate Prisma client**:
    ```bash
    pnpm db:generate
    ```
*   **Run database migrations**:
    ```bash
    pnpm db:migrate
    ```
*   **Reset the database**:
    ```bash
    pnpm db:reset
    ```
*   **Seed the database**:
    ```bash
    pnpm db:seed
    ```

## Development Conventions

*   **Monorepo Structure**: The project is a monorepo with packages in `apps/*`.
*   **TypeScript**: The entire codebase is written in TypeScript. Strict type-checking is enforced.
*   **API Development**: The API is in `apps/api`. It follows a standard structure for an Express application with routes, services, and middleware. The server is started with `apps/api/src/startServer.ts`.
*   **Frontend Development**: The frontend is a Next.js application in `apps/web`.
*   **Database Migrations**: Database schema changes are managed through Prisma migrations. To make a change, edit `prisma/schema.prisma` and run `pnpm db:migrate`.
*   **Testing**: Integration tests are located in the `tests/` directory and are run with the Node.js test runner and `tsx`. The tests are written to be deterministic and run serially.
*   **Coding Style**: The project uses Prettier for code formatting and ESLint for linting.
*   **Scripts**: The root `package.json` contains a rich set of scripts for managing the project. Many scripts use `pnpm --filter` to target specific packages. Custom scripts are located in the `scripts/` directory.

# Gemini Code Assistant Context: Book Worm

This document provides a comprehensive overview of the Book Worm project, intended to be used as instructional context for the Gemini Code Assistant.

## Project Overview

Book Worm is a solo-author fiction writing studio designed to help writers manage their creative projects. It provides tools for maintaining world consistency, tracking characters, and managing canon decisions.

The project is a full-stack application built as a TypeScript monorepo using `pnpm` workspaces.

### Architecture

*   **Monorepo**: The project is organized as a `pnpm` workspace, with individual packages located in the `apps/` directory.
*   **Backend API (`apps/api`)**: A Node.js application built with Express.js and TypeScript. It handles all business logic, data persistence, and exposes a RESTful API.
*   **Frontend Web (`apps/web`)**: A web application built with Next.js, React, and Tailwind CSS. It provides the user interface for the writing studio.
*   **Database**: The application uses a PostgreSQL database, with the schema managed by Prisma. The Prisma schema is located at `prisma/schema.prisma` and defines a comprehensive data model for users, entities (characters, factions, etc.), manuscripts, releases, and various workflow-related tables for comments, proposals, and reviews.

### Key Technologies

*   **Backend**: Node.js, Express.js, TypeScript, Prisma, Zod
*   **Frontend**: Next.js, React, TypeScript, Tailwind CSS
*   **Database**: PostgreSQL
*   **Tooling**: `pnpm`, `tsx`, `eslint`, `prettier`, Node.js test runner

## Building and Running

The `README.md` file provides detailed setup instructions. The following are the most common commands for development.

### Core Commands

*   **Install dependencies**:
    ```bash
    pnpm install
    ```
*   **Run in development mode**: (starts both API and web apps)
    ```bash
    pnpm dev
    ```
*   **Build all packages**:
    ```bash
    pnpm build
    ```
*   **Run tests**:
    ```bash
    pnpm test
    ```
*   **Run linter**:
    ```bash
    pnpm lint
    ```
*   **Run type-checking**:
    ```bash
    pnpm type-check
    ```
*   **Format code**:
    ```bash
    pnpm format
    ```

### Database Commands

*   **Generate Prisma client**:
    ```bash
    pnpm db:generate
    ```
*   **Run database migrations**:
    ```bash
    pnpm db:migrate
    ```
*   **Reset the database**:
    ```bash
    pnpm db:reset
    ```
*   **Seed the database**:
    ```bash
    pnpm db:seed
    ```

## Development Conventions

*   **Monorepo Structure**: The project is a monorepo with packages in `apps/*`.
*   **TypeScript**: The entire codebase is written in TypeScript. Strict type-checking is enforced.
*   **API Development**: The API is in `apps/api`. It follows a standard structure for an Express application with routes, services, and middleware. The server is started with `apps/api/src/startServer.ts`.
*   **Frontend Development**: The frontend is a Next.js application in `apps/web`.
*   **Database Migrations**: Database schema changes are managed through Prisma migrations. To make a change, edit `prisma/schema.prisma` and run `pnpm db:migrate`.
*   **Testing**: Integration tests are located in the `tests/` directory and are run with the Node.js test runner and `tsx`. The tests are written to be deterministic and run serially.
*   **Coding Style**: The project uses Prettier for code formatting and ESLint for linting.
*   **Scripts**: The root `package.json` contains a rich set of scripts for managing the project. Many scripts use `pnpm --filter` to target specific packages. Custom scripts are located in the `scripts/` directory.

## Project Analysis and Frontend Roadmap (March 2026)

This analysis is based on a deep dive into the codebase and the project's planning documents, primarily `docs/build-plans/master-plan-tracker.md` and `docs/build-system/book-worm-build-system/ui-vision.md`.

### Current Status

*   **Backend**: Feature-complete. Phases 0-5 of the build plan are finished, meaning the entire API, database schema, and all business logic for core features are implemented.
*   **Frontend**: In the very early stages. Phase 6, which focuses on the UI/UX, has begun. The "root shell" of the application has been styled to match the "ethereal fantasy" design vision, but it is not connected to the backend. The application is currently a static chat interface.

### Frontend Implementation Roadmap

The primary task is to build the frontend interface and connect it to the comprehensive backend API, following the design principles laid out in the `ui-vision.md` document.

#### Core Objective
Apply the "ethereal fantasy" UI/UX vision to the full set of backend features. This means using the established dark, atmospheric theme, fantasy-inspired typography (Cormorant Garamond, Spectral), and decorative elements to build a beautiful and immersive user experience.

#### Phase 6, Stage 03: Global Styling Implementation (Immediate Next Steps)

This stage focuses on applying the new visual system to the highest-impact admin screens.

1.  **Entity List Page**:
    *   **Task**: Create a page at `/admin/entities` to display a list of all entities (Characters, Factions, Locations, etc.).
    *   **API Endpoint**: `GET /admin/entities`
    *   **UI/UX**: The page should feature a searchable, filterable table or grid styled with the fantasy theme.

2.  **Entity Edit Flow**:
    *   **Task**: Create a form for creating and editing entities. This form should be accessible from the entity list page.
    *   **API Endpoints**: `POST /admin/:entityType/drafts` (for creation), `PATCH /admin/:entityType/:slug/drafts` (for updates).
    *   **UI/UX**: The form should be intuitive and styled according to the `ui-vision.md`, with elegant input fields and fantasy-themed buttons.

3.  **Review Inbox**:
    *   **Task**: Implement the "Review Inbox" dashboard for users to see and manage review requests assigned to them.
    *   **API Endpoint**: `GET /review-inbox`
    *   **UI/UX**: This will be a key dashboard for the collaboration workflow. It should present a clear list of review requests with their status and relevant actions.

4.  **Shared Admin Surfaces**:
    *   **Task**: Ensure all common UI elements used across the admin area (buttons, modals, tables, navigation, etc.) are styled consistently with the new visual language.

#### Phase 6, Stage 04: UI/UX Surface Expansion (Future Work)

This stage involves building out the rest of the application's features.

1.  **Authentication**:
    *   **Task**: Implement a full login/logout flow.
    *   **API Endpoints**: `POST /auth/session`, `DELETE /auth/session`.
    *   **UI/UX**: The login page should feature a "hero" header with immersive fantasy artwork, as suggested in `ui-vision.md`.

2.  **Public Codex**:
    *   **Task**: Build all public-facing pages for readers. This is a major feature set.
    *   **API Endpoints**: Use the various endpoints under `/codex`, `/discover`, `/search`, and the public-facing entity routes (e.g., `/characters/:slug`).
    *   **UI/UX**: This should feel like an immersive wiki or companion site for the author's world. Key features from `ui-vision.md` to implement here include:
        *   Interactive world maps.
        *   Glossaries and character lists.
        *   A visually appealing chapter reader.
        *   Scroll-based storytelling elements.

3.  **Collaboration Features**:
    *   **Task**: Build the user interfaces for the entire collaboration and review workflow.
    *   **API Endpoints**: Use the endpoints for `/comments`, `/proposals`, and `/review-requests`.
    *   **UI/UX**: This includes:
        *   Displaying comment threads on entities and manuscripts.
        *   Forms for creating and viewing change proposals.
        *   A detailed view for review requests, showing the approval chain and history.

### Architectural Recommendations

To support the development of this complex frontend, the following architectural improvements are strongly recommended:

*   **Shared Types Package**:
    *   **Problem**: Currently, there is no way to share types between the `api` and `web` packages, which will lead to code duplication and potential inconsistencies.
    *   **Recommendation**: Create a new package in the `pnpm` workspace (e.g., `packages/shared-types`) to hold all the Prisma-generated types and Zod schemas that need to be shared between the frontend and backend.
*   **Dedicated API Client**:
    *   **Problem**: Without a centralized API client, `fetch` calls will be scattered throughout the codebase, making the application difficult to maintain and debug.
    *   **Recommendation**: Create a dedicated API client for the frontend. This client should be responsible for all communication with the backend, including managing authentication headers, handling responses, and parsing errors.
*   **Server State Management**:
    *   **Problem**: Managing the state of data fetched from the server is complex. Using `useState` and `useEffect` for this purpose will lead to a large amount of boilerplate code and potential bugs.
    *   **Recommendation**: Use a modern data-fetching and caching library like **TanStack Query (formerly React Query)**. This library will handle fetching, caching, and synchronization of server state automatically, drastically simplifying the frontend code and improving the user experience by providing features like background refetching and optimistic updates.
