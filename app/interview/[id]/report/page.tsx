import { db } from "@/lib/db";
import { interviewSessions, interviewReports, problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import ScoreRadar from "@/components/ScoreRadar";

type Scores = {
  approachExplanation: number;
  communication: number;
  complexityAnalysis: number;
  dryRunThoroughness: number;
  codeCorrectness: number;
  overall: number;
};

const DIM_LABELS: { key: keyof Scores; label: string }[] = [
  { key: "approachExplanation", label: "Approach" },
  { key: "communication", label: "Communication" },
  { key: "complexityAnalysis", label: "Complexity" },
  { key: "dryRunThoroughness", label: "Dry Run" },
  { key: "codeCorrectness", label: "Correctness" },
];

function band(n: number) {
  if (n >= 80) return { label: "Strong", color: "text-emerald-400", bar: "bg-emerald-500" };
  if (n >= 55) return { label: "Decent", color: "text-amber-400", bar: "bg-amber-500" };
  return { label: "Needs work", color: "text-red-400", bar: "bg-red-500" };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (Number.isNaN(sessionId)) notFound();

  const { userId } = await auth();
  if (!userId) redirect("/");

  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));
  if (!session || session.userId !== userId) notFound();

  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId));

  const [report] = await db
    .select()
    .from(interviewReports)
    .where(eq(interviewReports.sessionId, sessionId));

  if (!report) {
    return (
      <main className="max-w-2xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold mb-3">Report not ready</h1>
        <p className="text-zinc-500 mb-6">
          This interview doesn&apos;t have a generated report yet.
        </p>
        <Link href={`/interview/${sessionId}`} className="text-indigo-500 hover:underline">
          ← Back to interview
        </Link>
      </main>
    );
  }

  const scores = report.scores as Scores;
  const overall = band(scores.overall);
  const radarData = DIM_LABELS.map((d) => ({ dimension: d.label, score: scores[d.key] }));

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10">
      <div className="flex items-center justify-between mb-2">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">← Dashboard</Link>
        <Link href="/problems" className="text-sm text-zinc-500 hover:text-zinc-300">Problems →</Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Interview Report</h1>
      <p className="text-zinc-500 mb-8">{problem?.title} · {problem?.difficulty}</p>

      {/* Overall score */}
      <div className="grid md:grid-cols-[220px_1fr] gap-6 mb-8">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold tabular-nums">{scores.overall}</div>
          <div className="text-sm text-zinc-500">/ 100 overall</div>
          <div className={`mt-2 text-sm font-medium ${overall.color}`}>{overall.label}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <ScoreRadar data={radarData} />
        </div>
      </div>

      {/* Dimension bars */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">Breakdown</h2>
        <div className="space-y-4">
          {DIM_LABELS.map((d) => {
            const v = scores[d.key];
            const b = band(v);
            return (
              <div key={d.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{d.label}</span>
                  <span className="tabular-nums text-zinc-500">{v}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className={`h-full ${b.bar} rounded-full`} style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gemini feedback */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
          🤖 Interviewer Feedback
        </h2>
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {report.feedback}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/problems/${session.problemId}`}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-400">
          Try this problem again
        </Link>
        <Link href="/dashboard"
          className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          View dashboard
        </Link>
      </div>
    </main>
  );
}
