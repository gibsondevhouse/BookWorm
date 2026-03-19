# MVP: Risks and Mitigations

- **Feature creep:** Adding too many features beyond the MVP scope may delay the schedule. Mitigation: adhere to the non‑goals, maintain a strict backlog and use the Beta phase to introduce additional features.
- **Data model complexity:** Expanding to all entity types and relations may reveal unforeseen edge cases. Mitigation: revisit the Domain Model specification and involve stakeholders in model reviews.
- **Search correctness:** Building a sophisticated search with filters and spoiler handling is challenging. Mitigation: implement incremental search features and test them thoroughly, deferring advanced ranking until Beta.
- **Release logic bugs:** Incorrect release snapshots may cause inconsistent public rendering. Mitigation: write tests for release creation and ensure the public site reads only from releases.
- **Continuity false positives/negatives:** Basic continuity rules may generate noise or miss issues. Mitigation: allow manual overrides and document limitations. Plan improvements for Beta.
- **Import/export reliability:** File parsing may fail on edge cases or produce mismatched relationships. Mitigation: define a strict file format and write validation checks. Include sample files and test round‑trips.
- **Performance and scalability:** MVP does not optimise for high load. Mitigation: document performance constraints and address them in Beta/v1.
- **Security vulnerabilities:** More features mean more attack surface. Mitigation: follow secure coding practices, use libraries for input sanitisation and plan for a security audit.
