# Beta: Scope

Included:

- UX audit and improvements: responsive layouts, accessibility fixes, navigation refinement, better metadata presentation.
- Collaboration features: comments on entities and chapters, change proposals, review queues and acceptance workflow. Notification system can be minimal (dashboard lists).
- Release review interface: side‑by‑side or inline diff viewer for entities and chapters across releases. Ability to compare metadata and relations.
- Search tuning: add fuzzy search, synonyms, alias matching. Adjust ranking weights. Provide query suggestions.
- Continuity rules expansion: implement travel time checks (distance vs timeline), age consistency (characters cannot be older or younger than plausible), inheritance and succession rules, magic system constraints. Include validation of event ordering in multiple timelines.
- Import/export maturity: support zip packages containing Markdown, JSON and images; conflict resolution options; detailed logs and progress indicators.
- Operations enhancements: centralised logging, metrics collection (CPU, memory, request latency), health endpoints for each service, backup/restore scripts and documentation.
- Feedback integration: triage MVP feedback, prioritise high‑impact issues and implement fixes or improvements.

Excluded:

- Major new entity categories or domain model changes.
- Graphical relationship visualisation; Beta focuses on textual/tabular representations.
- Real‑time notifications or email systems; adopt simple in‑app lists instead.
- Support for multi‑tenant or SaaS deployment; focus remains on single‑tenant self‑hosting.
