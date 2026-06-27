"use server";

import { db } from "@/lib/db";
import { submissions, problems, interviewSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";

const PHASE_ORDER = [
  "INTRO",
  "APPROACH",
  "TRANSITION_TO_CODE",
  "CODING",
  "SILENT_CHECK",
  "DRY_RUN",
  "COMPLEXITY",
  "WRAP_UP",
  "EVALUATION",
  "COMPLETED",
] as const;


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function submitSolution(input: {
  problemId: number;
  code: string;
  language: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("You must be signed in to submit a solution.");
  }

  const [inserted] = await db
    .insert(submissions)
    .values({
      userId,
      problemId: input.problemId,
      code: input.code,
      language: input.language,
    })
    .returning();

  return { id: inserted.id };
}

export async function reviewCode(submissionId: number) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId));

  if (!submission) {
    throw new Error("Submission not found");
  }

  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, submission.problemId));

  if (!problem) {
    throw new Error("Problem not found");
  }

  const prompt = `You are a senior software engineer reviewing a candidate's solution to a coding interview problem.

PROBLEM:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}

CANDIDATE'S CODE (${submission.language}):
\`\`\`${submission.language}
${submission.code}
\`\`\`

Please review this solution. Be concise and constructive. Cover:
1. Correctness — does this solve the problem?
2. Time complexity
3. Space complexity
4. Edge cases the candidate may have missed
5. One concrete suggestion for improvement (if any)

Keep the response under 200 words. Use clear, friendly tone.`;

  const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
  });
  const reviewText = response.text ?? "(No review generated)"

  await db
    .update(submissions)
    .set({aiReview : reviewText})
    .where(eq(submissions.id,submissionId));
    
  return { review: reviewText };
}


export async function startInterview(input: { problemId:number}){
  const {userId} = await auth();
  if(!userId){
    throw new Error("You must be signed in to start an interview.");
  }

  const [session] = await db.insert(interviewSessions).values({userId,problemId:input.problemId}).returning();

  return {sessionId : session.id};
}

export async function advancePhase(sessionId: number) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not signed in.");
  }

  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));

  if (!session) {
    throw new Error("Interview session not found.");
  }
  if (session.userId !== userId) {
    throw new Error("This interview does not belong to you.");
  }

  const currentIndex = PHASE_ORDER.indexOf(session.currentPhase);
  const nextPhase = PHASE_ORDER[currentIndex + 1] ?? "COMPLETED";

  await db
    .update(interviewSessions)
    .set({
      currentPhase: nextPhase,
      ...(nextPhase === "COMPLETED" ? { endedAt: new Date() } : {}),
    })
    .where(eq(interviewSessions.id, sessionId));

  return { phase: nextPhase };
}

export async function saveInterviewCode(input: {
  sessionId: number;
  code: string;
  language: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not signed in.");
  }

  await db
    .update(interviewSessions)
    .set({ finalCode: input.code, language: input.language })
    .where(eq(interviewSessions.id, input.sessionId));

  return { ok: true };
}

export async function endInterview(sessionId: number) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not signed in.");
  }

  await db
    .update(interviewSessions)
    .set({ currentPhase: "COMPLETED", endedAt: new Date() })
    .where(eq(interviewSessions.id, sessionId));

  return { phase: "COMPLETED" as const };
}