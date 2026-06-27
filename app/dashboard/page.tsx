import { db } from "@/lib/db";
import { interviewSessions, submissions, problems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import TrendChart from "@/components/TrendChart";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  // Pull this user's sessions + the problem for each, newest first.
  const sessions = await db
    .select({
      id: interviewSessions.id,
      phase: interviewSessions.currentPhase,
      score: interviewSessions.totalScore,
      startedAt: interviewSessions.startedAt,
      problemTitle: problems.title,
      topic: problems.topic,
      difficulty: problems.difficulty,
    })
    .from(interviewSessions)
    .leftJoin(problems, eq(interviewSessions.problemId, problems.id))
    .where(eq(interviewSessions.userId, userId))
    .orderBy(desc(interviewSessions.startedAt));

  const userSubs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.userId, userId));

  const completed = sessions.filter((s) => s.score != null);
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
      : null;
  const best = completed.reduce((m, s) => Math.max(m, s.score ?? 0), 0);

  // Trend (oldest -> newest) for the chart
  const trend = [...completed]
    .reverse()
    .map((s, i) => ({ name: `#${i + 1}`, score: s.score ?? 0 }));

  // Topic mastery: average score per topic
  const topicMap = new Map<string, { sum: number; n: number }>();
  for (const s of completed) {
    const t = s.topic ?? "Other";
    const prev = topicMap.get(t) ?? { sum: 0, n: 0 };
    topicMap.set(t, { sum: prev.sum + (s.score ?? 0), n: prev.n + 1 });
  }
  const topics = [...topicMap.entries()]
    .map(([topic, { sum, n }]) => ({ topic, avg: Math.round(sum / n), n }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h1>
      <p className="text-zinc-500 mb-8">Your interview performance & practice stats.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Interviews" value={String(sessions.length)} />
        <Stat label="Completed" value={String(completed.length)} />
        <Stat label="Avg Score" value={avgScore != null ? String(avgScore) : "—"} />
        <Stat label="Best Score" value={completed.length ? String(best) : "—"} />
      </div>

      {/* Trend */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Score Trend
        </h2>
        <TrendChart data={trend} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Topic mastery */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
            Topic Mastery
          </h2>
          {topics.length === 0 ? (
            <p className="text-sm text-zinc-500">Complete an interview to see topic mastery.</p>
          ) : (
            <div className="space-y-3">
              {topics.map((t) => (
                <div key={t.topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t.topic}</span>
                    <span className="text-zinc-500 tabular-nums">{t.avg}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${t.avg}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Practice */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
            Coding Practice
          </h2>
          <div className="text-4xl font-bold tabular-nums mb-1">{userSubs.length}</div>
          <p className="text-sm text-zinc-500">solutions submitted for AI review</p>
          <Link href="/problems" className="inline-block mt-4 text-sm text-indigo-500 hover:underline">
            Practice more →
          </Link>
        </div>
      </div>

      {/* Recent interviews */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Recent Interviews
          </h2>
          <Link href="/problems" className="text-sm text-indigo-500 hover:underline">
            New interview
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No interviews yet.{" "}
            <Link href="/problems" className="text-indigo-500 hover:underline">
              Start your first one.
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sessions.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{s.problemTitle ?? "Problem"}</div>
                  <div className="text-xs text-zinc-500">
                    {s.difficulty} · {s.topic} ·{" "}
                    {s.phase === "COMPLETED" ? "Completed" : `In progress (${s.phase})`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {s.score != null ? (
                    <span className="text-sm font-semibold tabular-nums">{s.score}</span>
                  ) : (
                    <span className="text-xs text-zinc-500">—</span>
                  )}
                  {s.phase === "COMPLETED" ? (
                    <Link href={`/interview/${s.id}/report`} className="text-xs text-indigo-500 hover:underline">
                      Report
                    </Link>
                  ) : (
                    <Link href={`/interview/${s.id}`} className="text-xs text-indigo-500 hover:underline">
                      Resume
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
