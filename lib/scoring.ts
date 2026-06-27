/**
 * Rule-based scoring — ML v1 (PROJECT.md §7.4).
 * Works on day one with zero training data, scoring the TEXT of each phase answer.
 * Later this gets replaced/augmented by a trained model (XGBoost) once we collect data.
 *
 * Each dimension returns 0-100. Keep the rules transparent and explainable.
 */

const FILLER = ["um", "uh", "like", "you know", "basically", "actually", "kind of", "sort of"];
const TECH_KEYWORDS = [
  "complexity", "time", "space", "o(n", "o(1", "o(log", "hashmap", "hash map",
  "edge case", "optimize", "brute force", "two pointer", "binary search",
  "sort", "stack", "queue", "recursion", "iterate", "trade-off", "tradeoff",
];

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fillerRatio(s: string): number {
  const words = wordCount(s);
  if (!words) return 0;
  const lower = ` ${s.toLowerCase()} `;
  let count = 0;
  for (const f of FILLER) {
    const matches = lower.split(f).length - 1;
    count += matches;
  }
  return count / words;
}

function keywordHits(s: string, keys: string[]): number {
  const lower = s.toLowerCase();
  return keys.filter((k) => lower.includes(k)).length;
}

export type Answers = {
  approach: string;
  dryRun: string;
  complexity: string;
  wrapUp: string;
};

export type Scores = {
  approachExplanation: number;
  communication: number;
  complexityAnalysis: number;
  dryRunThoroughness: number;
  codeCorrectness: number;
  overall: number;
};

export type MlFeatures = {
  approachWords: number;
  totalWords: number;
  fillerRatio: number;
  techKeywordHits: number;
  mentionedComplexity: boolean;
  mentionedEdgeCase: boolean;
};

export function scoreInterview(
  answers: Answers,
  codeCorrect: boolean | null
): { scores: Scores; features: MlFeatures } {
  const { approach, dryRun, complexity, wrapUp } = answers;
  const allText = `${approach} ${dryRun} ${complexity} ${wrapUp}`;

  // Approach: rewards a substantive explanation that mentions technical reasoning.
  const aWords = wordCount(approach);
  const aKeywords = keywordHits(approach, TECH_KEYWORDS);
  const approachExplanation = clamp(
    Math.min(aWords, 80) * 0.7 + aKeywords * 8 + (aWords > 15 ? 15 : 0)
  );

  // Communication: penalize filler words, reward reasonable length & variety.
  const fr = fillerRatio(allText);
  const totalWords = wordCount(allText);
  const communication = clamp(
    85 - fr * 600 + (totalWords > 60 ? 10 : 0) + (totalWords > 150 ? 5 : 0)
  );

  // Complexity: did they actually talk about time/space + big-O?
  const complexityAnalysis = clamp(
    keywordHits(complexity, ["time", "space", "o(", "complexity", "log", "n^2", "linear"]) * 22 +
      (wordCount(complexity) > 8 ? 12 : 0)
  );

  // Dry run: thoroughness by length + mentioning concrete values/edge cases.
  const dryRunThoroughness = clamp(
    Math.min(wordCount(dryRun), 60) * 1.1 +
      keywordHits(dryRun, ["edge", "empty", "null", "negative", "duplicate", "example", "input", "step"]) * 9
  );

  // Correctness comes from the silent check (Gemini). null => unknown => neutral.
  const codeCorrectness = codeCorrect === null ? 50 : codeCorrect ? 95 : 35;

  const overall = clamp(
    approachExplanation * 0.2 +
      communication * 0.2 +
      complexityAnalysis * 0.2 +
      dryRunThoroughness * 0.15 +
      codeCorrectness * 0.25
  );

  const features: MlFeatures = {
    approachWords: aWords,
    totalWords,
    fillerRatio: Math.round(fr * 1000) / 1000,
    techKeywordHits: keywordHits(allText, TECH_KEYWORDS),
    mentionedComplexity: keywordHits(allText, ["complexity", "o("]) > 0,
    mentionedEdgeCase: allText.toLowerCase().includes("edge"),
  };

  return {
    scores: {
      approachExplanation,
      communication,
      complexityAnalysis,
      dryRunThoroughness,
      codeCorrectness,
      overall,
    },
    features,
  };
}
