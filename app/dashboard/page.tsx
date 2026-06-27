import { db } from "@/lib/db";
import { interviewSessions, submissions, problems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import TrendChart from "@/components/TrendChart";
import RandomInterviewButton from "@/components/RandomInterviewButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

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

  const userSubs = await db.select().from(submissions).where(eq(submissions.userId, userId));

  const completed = sessions.filter((s) => s.score != null);
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
      : null;
  const best = completed.reduce((m, s) => Math.max(m, s.score ?? 0), 0);

  const trend = [...completed].reverse().map((s, i) => ({ name: `#${i + 1}`, score: s.score ?? 0 }));

  const topicMap = new Map<string, { sum: number; n: number }>();
  for (const s of completed) {
    const t = s.topic ?? "Other";
    const prev = topicMap.get(t) ?? { sum: 0, n: 0 };
    topicMap.set(t, { sum: prev.sum + (s.score ?? 0), n: prev.n + 1 });
  }
  const topics = [...topicMap.entries()]
    .map(([topic, { sum, n }]) => ({ topic, avg: Math.round(sum / n) }))
    .sort((a, b) => b.avg - a.avg);

  const recent = sessions.slice(0, 5);

  return (
    <div className="app-dark">
      <main className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <span className="eyebrow">Your performance</span>
            <h1 className="page-title" style={{ marginTop: ".5rem" }}>Dashboard</h1>
            <p className="page-sub">Interview scores, trends, and practice stats.</p>
          </div>
          <RandomInterviewButton />
        </div>

        <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="card stat"><div className="num">{sessions.length}</div><div className="lbl">Interviews</div></div>
          <div className="card stat"><div className="num">{completed.length}</div><div className="lbl">Completed</div></div>
          <div className="card stat"><div className="num">{avgScore ?? "—"}</div><div className="lbl">Avg score</div></div>
          <div className="card stat"><div className="num">{completed.length ? best : "—"}</div><div className="lbl">Best score</div></div>
        </div>

        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="eyebrow" style={{ marginBottom: "1rem" }}>Score trend</h2>
          <TrendChart data={trend} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="dash-two">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 className="eyebrow" style={{ marginBottom: "1.2rem" }}>Topic mastery</h2>
            {topics.length === 0 ? (
              <p className="muted" style={{ fontSize: ".9rem" }}>Complete an interview to see topic mastery.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>
                {topics.map((t) => (
                  <div key={t.topic}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem", marginBottom: ".35rem" }}>
                      <span>{t.topic}</span>
                      <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{t.avg}</span>
                    </div>
                    <div className="track"><div className="fill" style={{ width: `${t.avg}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 className="eyebrow" style={{ marginBottom: "1.2rem" }}>Coding practice</h2>
            <div style={{ fontSize: "2.6rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{userSubs.length}</div>
            <p className="muted" style={{ fontSize: ".9rem" }}>solutions submitted for AI review</p>
            <Link href="/problems" className="link-accent" style={{ display: "inline-block", marginTop: "1rem", fontSize: ".9rem" }}>Practice more →</Link>
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
            <h2 className="eyebrow">Recent interviews</h2>
            <Link href="/history" className="link-accent" style={{ fontSize: ".85rem" }}>View all →</Link>
          </div>
          {sessions.length === 0 ? (
            <p className="muted" style={{ fontSize: ".9rem", paddingTop: ".5rem" }}>
              No interviews yet. <Link href="/problems" className="link-accent">Start your first one.</Link>
            </p>
          ) : (
            <div>
              {recent.map((s) => (
                <div className="row" key={s.id}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.problemTitle ?? "Problem"}</div>
                    <div className="muted" style={{ fontSize: ".78rem", marginTop: ".15rem" }}>
                      {s.difficulty} · {s.topic} · {s.phase === "COMPLETED" ? "Completed" : `In progress`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
                    {s.score != null ? (
                      <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{s.score}</span>
                    ) : (
                      <span className="muted" style={{ fontSize: ".78rem" }}>—</span>
                    )}
                    <Link href={s.phase === "COMPLETED" ? `/interview/${s.id}/report` : `/interview/${s.id}`} className="link-accent" style={{ fontSize: ".85rem" }}>
                      {s.phase === "COMPLETED" ? "Report" : "Resume"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
