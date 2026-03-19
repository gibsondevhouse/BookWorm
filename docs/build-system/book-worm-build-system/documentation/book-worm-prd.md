# Product Requirements Document (PRD): Book Worm

## Overview
Book Worm is a self‑hosted platform for managing fictional worlds, combining a public codex and reader with a private authoring and continuity system. It enables authors to structure their story world as entities and relationships, publish controlled public releases and maintain narrative consistency.

## Vision
To give authors a self‑hosted editorial codex that functions like an engine for story worlds. Book Worm blends a canon database, a lore website, a continuity engine, and a reading experience. It should feel like a premium literary archive rather than a dev tool or fandom wiki.

## Problem Statement
Authors often manage large fictional worlds using scattered documents, spreadsheets and wikis. This leads to canon drift, contradictory lore, spoiler leaks and poor linkage between notes and manuscript. Existing tools either focus on collaborative writing, generic wikis or tech‑centric CMS. Book Worm solves this by treating story elements as structured, versioned data and providing tools to manage publication and continuity.

## Goals
- Provide structured entity management for characters, factions, locations, events and other world elements.
- Deliver a polished public codex, timeline, atlas and reader interface.
- Enable authors to publish releases and control what is public, restricted or private.
- Offer search and continuity validation to ensure narrative consistency.
- Support import/export to avoid lock‑in and allow offline editing.
- Be fully self‑hostable with minimal external dependencies.

## Non‑Goals
- Real‑time collaborative editing similar to Google Docs.
- Multi‑tenant SaaS offering.
- AI‑driven story generation or automatic writing assistance.
- Mobile apps (initially). The focus is on the web interface.

## Target Users
- **Primary:** Solo authors building expansive fictional worlds who want control over their content and publishing.
- **Secondary:** Editors collaborating with authors, and readers who explore the public lore.

## Core Product Principles
- **Entity‑first:** Data must be structured and relational; free‑form pages are discouraged.
- **Public/Private Separation:** Spoilers and secret lore are hidden by default. Visibility tiers are enforced at every layer.
- **Versioned Canon:** Canon can change over time; releases capture snapshots for readers.
- **Continuity:** Narrative logic is enforced via rules and validations.
- **Editorial Aesthetic:** The product must feel like a premium archive, not a CMS.

## Functional Requirements
- Manage core entity types with metadata and relations.
- Admin interfaces for CRUD, relationships and metadata.
- Public codex with detail pages, timeline and atlas.
- Chapter reader with edition selection.
- Revision and release system.
- Search with filters and spoiler safety.
- Continuity engine for basic narrative checks.
- Import/export utilities.
- Authentication and role‑based permissions.
- Self‑hosting with documented runtime setup.

## User Stories
The PRD lists numerous stories, such as: as an author I can create a character with a summary, tags and related events; as a reader I can view a character page with summary and timeline; as an editor I can propose a change to a character; as an author I can create and publish a release; as a user I can search for a faction by name or tag.

## Constraints
The PRD notes constraints such as limited budget for advanced features and a focus on single tenant self‑hosting. It emphasises the need for disciplined architecture and a phased approach with MVP, Beta and v1.
