"use server";

import { db } from "@/lib/db";
import { submissions, problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function submitSolution(input: {
  problemId: number;
  code: string;
  language: string;
}) {
  const [inserted] = await db
    .insert(submissions)
    .values({
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
