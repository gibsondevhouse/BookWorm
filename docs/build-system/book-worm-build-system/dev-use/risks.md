# Dev‑Use: Risks and Mitigations

- **Architectural misalignment:** Early decisions about frameworks, schema or design system could constrain later phases. Mitigation: involve stakeholders in decisions, document alternatives and avoid over‑engineering.
- **Scope creep:** Adding too many features early may delay important foundation work. Mitigation: maintain a strict definition of non‑goals and push aspirational items to the MVP backlog.
- **Inconsistent coding patterns:** Without guidelines, different developers may write divergent styles. Mitigation: enforce linting, formatting, and code review standards from the start.
- **Insufficient data modelling:** Missing fields or relations in the initial schema may require painful migrations later. Mitigation: derive the schema from the Domain Model spec and review it thoroughly.
- **Security oversights:** Leaving authentication incomplete could create bad habits. Mitigation: implement minimal security correctly now and plan for audits in later phases.
- **Underestimated complexity:** Even the basics (auth, CRUD, design tokens) can take longer than expected. Mitigation: allocate time for learning and iteration; avoid building non‑essential features.
