import { db } from "@/lib/db";
import { interviewSessions, problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import InterviewRoom from "@/components/InterviewRoom";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (Number.isNaN(sessionId)) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));

  if (!session) {
    notFound();
  }

  // Ownership check — you can only view your own interview.
  if (session.userId !== userId) {
    notFound();
  }

  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId));

  if (!problem) {
    notFound();
  }

  return (
    <InterviewRoom
      sessionId={session.id}
      problem={{
        id: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        topic: problem.topic,
      }}
      initialPhase={session.currentPhase}
      initialCode={session.finalCode}
      initialLanguage={session.language}
    />
  );
}
