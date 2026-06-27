import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-2.5-flash";

type ProblemCtx = {
  title: string;
  difficulty: string;
  description: string;
};

async function gen(prompt: string): Promise<string> {
  const res = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return (res.text ?? "").trim();
}

/** Extract the first JSON object from a model response (handles ```json fences). */
function parseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return fallback;
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}

/**
 * APPROACH phase: ask ONE short, probing follow-up based on what the candidate said.
 * Reacts to their actual words — this is what makes it feel like a real interview.
 */
export async function getApproachFollowUp(
  problem: ProblemCtx,
  candidateApproach: string
): Promise<string> {
  if (!candidateApproach.trim()) {
    return "Take your time — how would you start thinking about this problem?";
  }
  const prompt = `You are a friendly but sharp technical interviewer at a top tech company.
The candidate is solving this problem:

Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}

The candidate just explained their approach:
"""${candidateApproach}"""

Ask exactly ONE short, probing follow-up question (one or two sentences max) that pushes them
to justify a choice, consider a trade-off, or handle an edge case. Do not solve it for them.
Do not preface with "Great" repeatedly. Output ONLY the question text, nothing else.`;
  const q = await gen(prompt);
  return q || "Why did you choose that approach over the alternatives?";
}

/**
 * SILENT_CHECK phase: read the candidate's code, decide if it's correct, and produce a
 * leading hint WITHOUT revealing the verdict. The hint is surfaced as a dry-run question.
 */
export async function runSilentCheck(
  problem: ProblemCtx,
  code: string,
  language: string
): Promise<{ isCorrect: boolean; bug: string; hint: string }> {
  if (!code.trim()) {
    return {
      isCorrect: false,
      bug: "No code written.",
      hint: "Let's start by walking through what your code does step by step.",
    };
  }
  const prompt = `You are a technical interviewer silently reviewing a candidate's code.
Do NOT reveal correctness to the candidate. Analyze it yourself.

Problem: ${problem.title}
${problem.description}

Candidate's ${language} code:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY a JSON object:
{
  "isCorrect": boolean,            // does it solve the problem for all reasonable inputs?
  "bug": "short description of the bug, or 'none'",
  "hint": "a single leading dry-run question that nudges the candidate to discover the bug themselves (if any). If the code is correct, ask a normal trace-through question. One sentence."
}`;
  const raw = await gen(prompt);
  return parseJson(raw, {
    isCorrect: false,
    bug: "Could not analyze.",
    hint: "Walk me through what your code does with a small example input.",
  });
}

/**
 * EVALUATION phase: qualitative end-of-interview feedback (the words).
 * Numbers come from the rule-based scorer; this complements them.
 */
export async function generateEvaluation(input: {
  problem: ProblemCtx;
  approach: string;
  dryRun: string;
  complexity: string;
  wrapUp: string;
  code: string;
  language: string;
  silentCheck: { isCorrect: boolean; bug: string } | null;
}): Promise<string> {
  const prompt = `You are a senior interviewer writing end-of-interview feedback for a candidate.
Be warm, specific, and constructive. 150-220 words. Use short paragraphs or bullet points.

PROBLEM: ${input.problem.title} (${input.problem.difficulty})
${input.problem.description}

CANDIDATE'S APPROACH EXPLANATION:
"""${input.approach || "(none given)"}"""

CANDIDATE'S DRY RUN:
"""${input.dryRun || "(none given)"}"""

CANDIDATE'S COMPLEXITY ANALYSIS:
"""${input.complexity || "(none given)"}"""

CANDIDATE'S WRAP-UP:
"""${input.wrapUp || "(none given)"}"""

FINAL CODE (${input.language}):
\`\`\`${input.language}
${input.code || "(no code)"}
\`\`\`

INTERNAL CODE CHECK (do not quote verbatim): ${
    input.silentCheck
      ? `correct=${input.silentCheck.isCorrect}, issue=${input.silentCheck.bug}`
      : "not run"
  }

Cover: (1) communication of approach, (2) code correctness & quality, (3) complexity analysis,
(4) one concrete thing to improve next time. End on an encouraging note.`;
  const out = await gen(prompt);
  return out || "Thanks for completing the interview! Keep practicing your verbal explanations alongside your coding.";
}
