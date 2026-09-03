/**
 * Universal STT Transcript Entity Extraction & Highlighting Utilities
 * Pure generic pattern matching for metrics, quotes, tech terms, and problem-solving markers.
 * Strictly avoids hardcoded sample datasets.
 */

export interface HighlightToken {
  text: string;
  type: 'text' | 'search_match' | 'metric' | 'quote' | 'tech_entity' | 'action_marker';
}

export interface ExtractedEntity {
  type: 'metric' | 'quote' | 'tech' | 'action';
  label: string;
  count: number;
}

// Universal Pattern Definitions
const PATTERNS = {
  // 1. Numerical & statistical metrics (percentages, fold/times, counts, durations, memory, network)
  // e.g., 85%, 2.5배, 500건, 30명, 1500만원, 250ms, 3초, 10분, 24시간, 6개월, 2년, 5GB, 1000TPS
  metric: /\b\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|배|건|명|원|달러|개|ms|초|분|시간|개월|년|일|GB|MB|KB|TB|TPS|QPS|점|단계|위|등|회|차|줄|fold|x|k|M|B))\b|\b\d+(?:\.\d+)?%/i,

  // 2. Quoted and explicit emphasis marks
  quote: /(?:["'‘“「]([^"'’”]*)["'’”」])/,

  // 3. Technical acronyms and CamelCase / PascalCase identifiers
  // e.g., API, HTTP, SQL, AWS, GCP, DB, REST, CI/CD, React, TypeScript, Kafka, Redis, Docker, Spring, etc.
  techAcronym: /\b[A-Z]{2,}(?:[\/][A-Z]{2,})*\b/,
  techCamel: /\b[A-Z][a-zA-Z0-9+#.-]{2,}\b/,

  // 4. Universal engineering & problem-solving action markers in Korean/English
  actionMarkers: [
    '개선', '최적화', '장애', '병목', '원인 분석', '해결', '구축', '설계', '도입',
    '검증', '테스트', '리팩토링', '성능 향상', '안정화', '트레이드오프', '모니터링',
    '배포', '협업', '조율', '자동화', '의사결정', '가설 검증', '문제 정의',
    'root cause', 'troubleshoot', 'refactor', 'optimize', 'benchmark'
  ]
};

/**
 * Escapes regex special characters in a search term
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses transcript text into structured tokens for rich contextual rendering
 */
export function parseTranscriptTokens(text: string, searchQuery?: string): HighlightToken[] {
  if (!text) return [];

  const trimmedQuery = searchQuery?.trim();
  if (!trimmedQuery) {
    return parseEntitiesOnly(text);
  }

  // Priority 1: Search query match has highest precedence
  const searchRegex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi');
  const parts = text.split(searchRegex);

  const tokens: HighlightToken[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.toLowerCase() === trimmedQuery.toLowerCase()) {
      tokens.push({ text: part, type: 'search_match' });
    } else {
      // Sub-parse non-matching text for entities
      const subTokens = parseEntitiesOnly(part);
      tokens.push(...subTokens);
    }
  }

  return tokens;
}

/**
 * Parses entities from pure text segment
 */
function parseEntitiesOnly(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let remaining = text;

  // Build combined regex with action markers
  const actionPattern = PATTERNS.actionMarkers.map(m => escapeRegExp(m)).join('|');
  const combinedRegex = new RegExp(
    `(${PATTERNS.metric.source})|(${PATTERNS.quote.source})|(${PATTERNS.techAcronym.source})|(${PATTERNS.techCamel.source})|(${actionPattern})`,
    'g'
  );

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = combinedRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchStr = match[0];

    // Push preceding plain text
    if (matchStart > lastIndex) {
      tokens.push({
        text: text.slice(lastIndex, matchStart),
        type: 'text'
      });
    }

    // Determine type
    let tokenType: HighlightToken['type'] = 'text';
    if (PATTERNS.metric.test(matchStr)) {
      tokenType = 'metric';
    } else if (matchStr.startsWith('"') || matchStr.startsWith("'") || matchStr.startsWith('‘') || matchStr.startsWith('“') || matchStr.startsWith('「')) {
      tokenType = 'quote';
    } else if (PATTERNS.actionMarkers.some(m => m.toLowerCase() === matchStr.toLowerCase())) {
      tokenType = 'action_marker';
    } else if (PATTERNS.techAcronym.test(matchStr) || PATTERNS.techCamel.test(matchStr)) {
      tokenType = 'tech_entity';
    }

    tokens.push({
      text: matchStr,
      type: tokenType
    });

    lastIndex = matchStart + matchStr.length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    tokens.push({
      text: text.slice(lastIndex),
      type: 'text'
    });
  }

  return tokens.length > 0 ? tokens : [{ text, type: 'text' }];
}

/**
 * Extracts distinct highlightable entities for pills and summary badges
 */
export function extractKeyEntities(text: string): ExtractedEntity[] {
  if (!text) return [];

  const entitiesMap = new Map<string, ExtractedEntity>();

  // 1. Metric matches
  const metricMatches = text.match(new RegExp(PATTERNS.metric.source, 'gi'));
  if (metricMatches) {
    for (const m of metricMatches) {
      const key = m.trim();
      const existing = entitiesMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        entitiesMap.set(key, { type: 'metric', label: key, count: 1 });
      }
    }
  }

  // 2. Quoted matches
  const quoteMatches = text.match(/["'‘“「]([^"'’”]*)["'’”」]/g);
  if (quoteMatches) {
    for (const q of quoteMatches) {
      const clean = q.replace(/["'‘“「"'’”」]/g, '').trim();
      if (clean.length > 1 && clean.length < 30) {
        const existing = entitiesMap.get(clean);
        if (existing) {
          existing.count++;
        } else {
          entitiesMap.set(clean, { type: 'quote', label: `“${clean}”`, count: 1 });
        }
      }
    }
  }

  // 3. Action markers
  for (const marker of PATTERNS.actionMarkers) {
    const regex = new RegExp(`\\b${escapeRegExp(marker)}\\b|${escapeRegExp(marker)}`, 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      entitiesMap.set(marker, { type: 'action', label: marker, count: matches.length });
    }
  }

  // 4. Tech entities (deduplicated, min length 2)
  const techMatches = text.match(/\b[A-Z]{2,}\b|\b[A-Z][a-zA-Z0-9+#.-]{2,}\b/g);
  if (techMatches) {
    for (const t of techMatches) {
      if (t.length > 1 && !PATTERNS.actionMarkers.includes(t)) {
        const existing = entitiesMap.get(t);
        if (existing) {
          existing.count++;
        } else {
          entitiesMap.set(t, { type: 'tech', label: t, count: 1 });
        }
      }
    }
  }

  return Array.from(entitiesMap.values()).slice(0, 6);
}

/**
 * Computes words count and approximate speech rate stats
 */
export function computeSpeechStats(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { wordCount: 0, charCount: 0, estimatedSeconds: 0 };
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = trimmed.length;

  // Average speaking rate ~ 3.5 syllables/chars per second in Korean, ~130-150 words/min
  const estimatedSeconds = Math.max(1, Math.round(charCount / 5));

  return { wordCount, charCount, estimatedSeconds };
}
