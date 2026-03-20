import type { SearchQuery } from "./searchTypes.js";

type ExpansionSource = "ALIAS" | "SYNONYM";

type ExpansionRule = {
  source: ExpansionSource;
  terms: readonly string[];
};

type ExpansionResult = {
  normalizedQuery: string | undefined;
  expandedTerms: string[];
  typoTerms: string[];
  expansionSources: ExpansionSource[];
};

const MAX_TYPO_EDIT_DISTANCE = 1;
const MIN_TYPO_TOKEN_LENGTH = 5;

const QUERY_EXPANSION_RULES: Record<string, ExpansionRule> = {
  mage: { source: "ALIAS", terms: ["wizard", "sorcerer"] },
  wizard: { source: "ALIAS", terms: ["mage", "sorcerer"] },
  sorcerer: { source: "ALIAS", terms: ["mage", "wizard"] },
  war: { source: "SYNONYM", terms: ["conflict", "battle"] },
  battle: { source: "SYNONYM", terms: ["war", "conflict"] },
  conflict: { source: "SYNONYM", terms: ["war", "battle"] }
};

export function expandSearchQuery(query: SearchQuery): ExpansionResult {
  const normalizedQuery = normalizeTerm(query.q);
  if (!normalizedQuery) {
    return {
      normalizedQuery: undefined,
      expandedTerms: [],
      typoTerms: [],
      expansionSources: []
    };
  }

  const tokens = normalizedQuery
    .split(/\s+/)
    .map((token) => normalizeTerm(token))
    .filter((token): token is string => token !== undefined);

  const expanded = new Set<string>();
  const typoTerms = new Set<string>();
  const sources = new Set<ExpansionSource>();
  const ruleKeys = Object.keys(QUERY_EXPANSION_RULES).sort((a, b) => a.localeCompare(b));

  for (const token of tokens) {
    const rule = QUERY_EXPANSION_RULES[token];
    if (rule) {
      sources.add(rule.source);
      for (const term of rule.terms) {
        expanded.add(term);
      }
    }

    const typoCandidate = resolveTypoRuleKey(token, ruleKeys);
    if (!typoCandidate) {
      continue;
    }

    typoTerms.add(typoCandidate);

    const typoRule = QUERY_EXPANSION_RULES[typoCandidate];
    if (!typoRule) {
      continue;
    }

    sources.add(typoRule.source);
    for (const term of typoRule.terms) {
      typoTerms.add(term);
    }
  }

  expanded.delete(normalizedQuery);
  typoTerms.delete(normalizedQuery);

  for (const term of expanded) {
    typoTerms.delete(term);
  }

  return {
    normalizedQuery,
    expandedTerms: Array.from(expanded).sort((a, b) => a.localeCompare(b)),
    typoTerms: Array.from(typoTerms).sort((a, b) => a.localeCompare(b)),
    expansionSources: Array.from(sources).sort((a, b) => a.localeCompare(b))
  };
}

function normalizeTerm(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveTypoRuleKey(token: string, candidates: readonly string[]): string | undefined {
  if (token.length < MIN_TYPO_TOKEN_LENGTH) {
    return undefined;
  }

  let best: { candidate: string; distance: number } | undefined;

  for (const candidate of candidates) {
    if (candidate === token || candidate.length < MIN_TYPO_TOKEN_LENGTH) {
      continue;
    }

    if (Math.abs(candidate.length - token.length) > MAX_TYPO_EDIT_DISTANCE) {
      continue;
    }

    const distance = damerauLevenshteinDistance(token, candidate, MAX_TYPO_EDIT_DISTANCE);
    if (distance > MAX_TYPO_EDIT_DISTANCE) {
      continue;
    }

    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && candidate.localeCompare(best.candidate) < 0)
    ) {
      best = { candidate, distance };
    }
  }

  return best?.candidate;
}

function damerauLevenshteinDistance(a: string, b: string, maxDistance: number): number {
  const aLen = a.length;
  const bLen = b.length;
  const overflowDistance = maxDistance + 1;

  if (Math.abs(aLen - bLen) > maxDistance) {
    return overflowDistance;
  }

  const matrix: number[][] = Array.from({ length: aLen + 1 }, () =>
    Array.from({ length: bLen + 1 }, () => 0)
  );

  const getCell = (row: number, col: number): number => {
    const rowValues = matrix[row];
    if (!rowValues) {
      return overflowDistance;
    }

    const value = rowValues[col];
    return value ?? overflowDistance;
  };

  const setCell = (row: number, col: number, value: number): void => {
    const rowValues = matrix[row];
    if (!rowValues) {
      return;
    }

    rowValues[col] = value;
  };

  for (let i = 0; i <= aLen; i += 1) {
    setCell(i, 0, i);
  }

  for (let j = 0; j <= bLen; j += 1) {
    setCell(0, j, j);
  }

  for (let i = 1; i <= aLen; i += 1) {
    let rowMin = Number.POSITIVE_INFINITY;

    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const substitution = getCell(i - 1, j - 1) + cost;
      const insertion = getCell(i, j - 1) + 1;
      const deletion = getCell(i - 1, j) + 1;
      let value = Math.min(substitution, insertion, deletion);

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        value = Math.min(value, getCell(i - 2, j - 2) + cost);
      }

      setCell(i, j, value);
      if (value < rowMin) {
        rowMin = value;
      }
    }

    if (rowMin > maxDistance) {
      return overflowDistance;
    }
  }

  return getCell(aLen, bLen);
}
