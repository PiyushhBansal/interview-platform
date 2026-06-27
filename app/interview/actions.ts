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

  const { scores, features } = scoreInterview(ans, silent ? silent.isCorrect : null);

  const feedback = await generateEvaluation({
    problem: {
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
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
    scores,
    feedback,
    mlFeatures: features,
  });

  await db
    .update(interviewSessions)
    .set({ totalScore: scores.overall, currentPhase: "COMPLETED", endedAt: new Date() })
    .where(eq(interviewSessions.id, sessionId));

  return { scores, feedback };
}
