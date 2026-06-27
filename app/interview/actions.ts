"use server";

import { db } from "@/lib/db";
import {
  interviewSessions,
  interviewAnswers,
  interviewReports,
  problems,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import {
  getApproachFollowUp,
  runSilentCheck,
  generateEvaluation,
} from "@/lib/interviewer";
import { scoreInterview, type Answers } from "@/lib/scoring";

type Phase =
  | "INTRO" | "APPROACH" | "TRANSITION_TO_CODE" | "CODING" | "SILENT_CHECK"
  | "DRY_RUN" | "COMPLEXITY" | "WRAP_UP" | "EVALUATION" | "COMPLETED";

/** Start an interview on a specific problem, or a random one if no id given. */
export async function startInterviewOn(problemId?: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to start an interview.");

  let pid = problemId;
  if (pid == null) {
    const all = await db.select({ id: problems.id }).from(problems);
    if (all.length === 0) throw new Error("No problems available.");
    // Deterministic-free pick: use current time modulo count (server-side).
    const idx = Date.now() % all.length;
    pid = all[idx].id;
  }

  const [session] = await db
    .insert(interviewSessions)
    .values({ userId, problemId: pid })
    .returning();

  return { sessionId: session.id };
}

async function ownedSession(sessionId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in.");
  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));
  if (!session) throw new Error("Session not found.");
  if (session.userId !== userId) throw new Error("Not your interview.");
  return session;
}

async function problemFor(problemId: number) {
  const [p] = await db.select().from(problems).where(eq(problems.id, problemId));
  if (!p) throw new Error("Problem not found.");
  return p;
}

/** Save (or replace) the candidate's answer for a phase. */
export async function saveAnswer(input: {
  sessionId: number;
  phase: Phase;
  transcript: string;
}) {
  await ownedSession(input.sessionId);

  const existing = await db
    .select()
    .from(interviewAnswers)
    .where(
      and(
        eq(interviewAnswers.sessionId, input.sessionId),
        eq(interviewAnswers.phase, input.phase)
      )
    );

  if (existing.length) {
    await db
      .update(interviewAnswers)
      .set({ transcript: input.transcript })
      .where(eq(interviewAnswers.id, existing[0].id));
  } else {
    await db.insert(interviewAnswers).values({
      sessionId: input.sessionId,
      phase: input.phase,
      transcript: input.transcript,
    });
  }
  return { ok: true };
}

/** Gemini follow-up for the APPROACH phase, based on what the candidate said. */
export async function getFollowUp(input: {
  sessionId: number;
  approach: string;
}) {
  const session = await ownedSession(input.sessionId);
  const problem = await problemFor(session.problemId);
  const question = await getApproachFollowUp(
    {
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
    },
    input.approach
  );
  return { question };
}

/** Silently analyze the code; store the verdict; return only the hint to the UI. */
export async function runSilentCheckAction(input: {
  sessionId: number;
  code: string;
  language: string;
}) {
  const session = await ownedSession(input.sessionId);
  const problem = await problemFor(session.problemId);

  const result = await runSilentCheck(
    {
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
    },
    input.code,
    input.language
  );

  await db
    .update(interviewSessions)
    .set({ silentCheck: result, finalCode: input.code, language: input.language })
    .where(eq(interviewSessions.id, input.sessionId));

  // Candidate only sees the hint — never the verdict (the whole point).
  return { hint: result.hint };
}

/** Build the final report: Gemini feedback + rule-based scores, saved to DB. */
export async function generateReport(sessionId: number) {
  const session = await ownedSession(sessionId);
  const problem = await problemFor(session.problemId);

  const answers = await db
    .select()
    .from(interviewAnswers)
    .where(eq(interviewAnswers.sessionId, sessionId));

  const byPhase = (p: Phase) =>
    answers.find((a) => a.phase === p)?.transcript ?? "";

  const ans: Answers = {
    approach: byPhase("APPROACH"),
    dryRun: byPhase("DRY_RUN"),
    complexity: byPhase("COMPLEXITY"),
    wrapUp: byPhase("WRAP_UP"),
  };

  const silent = (session.silentCheck as { isCorrect: boolean; bug: string } | null) ?? null;

  // Rule-based features (ML v1) kept for analytics / the data flywheel.
  const { features } = scoreInterview(ans, silent ? silent.isCorrect : null);

  // LLM produces the spec's 6-category report card (each /10).
  const evaluation = await generateEvaluation({
    problem: {
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      optimalComplexity: problem.optimalComplexity,
    },
    approach: ans.approach,
    dryRun: ans.dryRun,
    complexity: ans.complexity,
    wrapUp: ans.wrapUp,
    code: session.finalCode ?? "",
    language: session.language ?? "javascript",
    silentCheck: silent,
  });

  // Replace any prior report for this session (idempotent).
  await db.delete(interviewReports).where(eq(interviewReports.sessionId, sessionId));
  await db.insert(interviewReports).values({
    sessionId,
    scores: {
      categories: evaluation.categories,
      overall: evaluation.overall,
      rating: evaluation.rating,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
    },
    feedback: evaluation.feedback,
    mlFeatures: features,
  });

  // Store overall on a 0-100 scale for dashboard/history consistency.
  await db
    .update(interviewSessions)
    .set({ totalScore: evaluation.overall * 10, currentPhase: "COMPLETED", endedAt: new Date() })
    .where(eq(interviewSessions.id, sessionId));

  return { evaluation };
}
