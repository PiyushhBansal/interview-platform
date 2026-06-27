import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-2.5-flash";

type ProblemCtx = {
  title: string;
  difficulty: string;
  description: string;
  optimalComplexity?: string | null;
};

/**
 * The interviewer persona + stage logic. Prepended to every conversational call
 * so the model behaves like one consistent human interviewer across phases.
 */
export const INTERVIEWER_SYSTEM_PROMPT = `You are "Loop", a senior software engineer conducting a real DSA technical interview at a top tech company.

PERSONA:
- Warm, calm, and human — like a good interviewer who wants the candidate to succeed.
- Conversational, never robotic. Short responses (1-3 sentences). You speak out loud.
- You react to what the candidate actually says — never read from a script.
- You probe, you never lecture. You ask leading questions instead of giving answers.

INTERVIEW STAGES (you guide the candidate through these in order):
1. Greeting + present the problem.
2. Approach discussion — let them explain before coding. Ask "why this approach?", "what's the time/space complexity?", "what edge cases matter?".
3. Optimization push — if their first idea is brute force, nudge: "can you do better than O(n^2)?".
4. Coding — stay mostly quiet while they write; offer light encouragement.
5. Dry run — have them trace their code on an example; if there's a bug, ask a question that exposes it rather than pointing it out.
6. Wrap up — "anything you'd improve with more time?".

RULES:
- Never reveal the optimal solution or whether their code is correct. Lead them to discover it.
- One question at a time. Keep it tight and natural.
- Be encouraging even when pushing back.`;

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
  const prompt = `${INTERVIEWER_SYSTEM_PROMPT}

CURRENT PROBLEM:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}

The candidate just explained their approach:
"""${candidateApproach}"""

You are in the APPROACH stage. Ask exactly ONE short, probing follow-up question (one or two
sentences) that pushes them to justify a choice, consider a trade-off, or handle an edge case.
Output ONLY the spoken question text, nothing else.`;
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

export type CategoryScores = {
  problemUnderstanding: number;
  approachCommunication: number;
  correctness: number;
  complexityAnalysis: number;
  optimization: number;
  codeQuality: number;
};

export type Evaluation = {
  categories: CategoryScores; // each /10
  overall: number; // /10
  rating: string; // e.g. "Strong Hire", "Lean Hire", "No Hire"
  strengths: string[];
  weaknesses: string[];
  feedback: string; // actionable summary paragraph
};

const EMPTY_EVAL: Evaluation = {
  categories: {
    problemUnderstanding: 0,
    approachCommunication: 0,
    correctness: 0,
    complexityAnalysis: 0,
    optimization: 0,
    codeQuality: 0,
  },
  overall: 0,
  rating: "Incomplete",
  strengths: [],
  weaknesses: ["The interview ended without enough signal to evaluate."],
  feedback: "Not enough was discussed or written to produce a full evaluation. Try a full run-through next time.",
};

/**
 * Final evaluation prompt — produces the spec's 6-category report card (each /10),
 * an overall rating, strengths, weaknesses, and actionable feedback.
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
}): Promise<Evaluation> {
  const prompt = `You are a senior engineer writing a structured evaluation of a candidate's DSA interview.
Be fair, specific, and grounded ONLY in what the candidate actually said and wrote. Do not invent strengths.

PROBLEM: ${input.problem.title} (${input.problem.difficulty})
${input.problem.description}
Optimal complexity: ${input.problem.optimalComplexity ?? "unspecified"}

TRANSCRIPT OF WHAT THE CANDIDATE SAID:
- Approach: """${input.approach || "(nothing)"}"""
- Dry run: """${input.dryRun || "(nothing)"}"""
- Complexity: """${input.complexity || "(nothing)"}"""
- Wrap-up: """${input.wrapUp || "(nothing)"}"""

FINAL CODE (${input.language}):
\`\`\`${input.language}
${input.code || "(no code written)"}
\`\`\`

INTERNAL CODE CHECK (use to judge correctness; do not quote verbatim): ${
    input.silentCheck
      ? `correct=${input.silentCheck.isCorrect}, issue=${input.silentCheck.bug}`
      : "not run"
  }

Score these SIX categories, each an integer 0-10:
- problemUnderstanding: did they clarify requirements, inputs/outputs, constraints?
- approachCommunication: clarity and structure of their verbal explanation.
- correctness: does the code actually solve it (use the internal check)?
- complexityAnalysis: did they state correct time AND space complexity?
- optimization: did they reach (or move toward) the optimal solution?
- codeQuality: readability, naming, edge-case handling.

Respond with ONLY this JSON (no markdown):
{
  "categories": { "problemUnderstanding": 0, "approachCommunication": 0, "correctness": 0, "complexityAnalysis": 0, "optimization": 0, "codeQuality": 0 },
  "overall": 0,
  "rating": "Strong Hire | Hire | Lean Hire | Lean No-Hire | No Hire",
  "strengths": ["2-4 specific, true strengths"],
  "weaknesses": ["2-4 specific, actionable gaps"],
  "feedback": "3-5 sentence actionable summary, warm but honest."
}`;

  const raw = await gen(prompt);
  const parsed = parseJson<Evaluation>(raw, EMPTY_EVAL);
  // Clamp & sanity-fill in case the model returns partial data.
  const c = parsed.categories || EMPTY_EVAL.categories;
  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
  const categories: CategoryScores = {
    problemUnderstanding: clamp(c.problemUnderstanding),
    approachCommunication: clamp(c.approachCommunication),
    correctness: clamp(c.correctness),
    complexityAnalysis: clamp(c.complexityAnalysis),
    optimization: clamp(c.optimization),
    codeQuality: clamp(c.codeQuality),
  };
  const vals = Object.values(categories);
  const overall = parsed.overall
    ? clamp(parsed.overall)
    : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return {
    categories,
    overall,
    rating: parsed.rating || "Evaluated",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4) : [],
    feedback: parsed.feedback || "Evaluation complete.",
  };
}
