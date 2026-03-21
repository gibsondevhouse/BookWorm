# Search Specification: Book Worm

Book Worm’s search system enables users to find entities, chapters and events quickly while respecting visibility and spoiler rules.

## Indexing

- **Fields indexed:** titles, slugs, aliases, summaries, tags, character traits, faction ideologies, locations’ regions, event summaries and dates. Chapters index titles and scene summaries.
- **Weighting:** titles and slugs have the highest weight; summaries have medium weight; tags and traits have lower weight. Recent revisions may get a small boost.
- **Aliases & synonyms:** Index alternate names and defined synonyms. Synonyms may be stored in a dictionary per locale.
- **Visibility & spoiler filtering:** Only public fields from the active release are indexed for public search. For editors and authors, restricted content is indexed; private content is indexed only for authors.

## Query Processing

- **Tokenisation:** Lowercase, strip punctuation, stem words. Support multi‑word queries.
- **Typo tolerance:** Use an approximate match algorithm (Levenshtein) to allow one or two character errors for short terms and proportionally more for longer terms.
- **Synonym expansion:** Expand query terms using synonyms before searching. Synonym matches are ranked lower than exact matches.
- **Role‑aware filtering:** Determine user role from the session and filter out restricted/private results accordingly.
- **Spoiler control:** If the user selects Spoiler‑Free, exclude results tagged with spoiler tiers above 0. Mild Spoilers allows tier 1; Full Archive returns everything allowed by role.

## Ranking

- Combine weighted term frequency with recency (more recent releases rank slightly higher), entity popularity (number of references) and exactness of match.
- Penalise results from deprecated or provisional entities.
- Boost search terms appearing in names and slugs.
- Down‑rank entities in draft releases not yet published.

## API & Responses

- **Endpoint:** `GET /api/search?q=<query>&types=<comma‑separated types>&spoiler=<level>&release=<releaseSlug>`
- **Parameters:**
  - `q`: the search query string.
  - `types`: optional list of entity types to restrict results (e.g. `character,faction`).
  - `spoiler`: one of `none`, `mild`, `full` to control spoiler filtering.
  - `release`: slug of the release to search; defaults to active release. Only authors may search unreleased snapshots.
  - `limit` and `page` for pagination.
- **Response:** JSON array of result objects: `{ id, type, title, summary, slug, tags, spoilerTier, release }`. Do not expose restricted fields.
- **Error Cases:** Return 400 for invalid parameters. Return 401 for unauthorised access.

## Safety Considerations

- Ensure that alias indexing does not leak hidden names (e.g. secret identities) when those names are restricted.
- Enforce visibility rules in both indexing and query time. Do not allow role escalation via query parameters.
- Validate all inputs to prevent injection attacks. Use prepared statements and parameterised queries.
