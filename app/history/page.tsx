import { db } from "@/lib/db";
import { interviewSessions, problems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

function scoreColor(n: number) {
  if (n >= 80) return "#6ee7b7";
  if (n >= 55) return "#fbbf24";
  return "#fb7185";
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const rows = await db
    .select({
      id: interviewSessions.id,
      phase: interviewSessions.currentPhase,
      score: interviewSessions.totalScore,
      startedAt: interviewSessions.startedAt,
      title: problems.title,
      topic: problems.topic,
      difficulty: problems.difficulty,
    })
    .from(interviewSessions)
    .leftJoin(problems, eq(interviewSessions.problemId, problems.id))
    .where(eq(interviewSessions.userId, userId))
    .orderBy(desc(interviewSessions.startedAt));

  const completed = rows.filter((r) => r.phase === "COMPLETED");

  return (
    <div className="app-dark">
      <main className="container">
        <span className="eyebrow">Your record</span>
        <h1 className="page-title" style={{ marginTop: ".5rem" }}>Interview History</h1>
        <p className="page-sub" style={{ marginBottom: "2rem" }}>
          Every mock interview you&apos;ve taken — {rows.length} total, {completed.length} completed.
        </p>

        {rows.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: "1.2rem" }}>
              You haven&apos;t taken any interviews yet.
            </p>
            <Link href="/problems" className="abtn">Start your first interview →</Link>
          </div>
        ) : (
          <div className="card" style={{ padding: "0 1.5rem" }}>
            {rows.map((r) => {
              const done = r.phase === "COMPLETED";
              return (
                <div className="row" key={r.id}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, letterSpacing: "-.01em" }}>
                      {r.title ?? "Problem"}
                    </div>
                    <div className="muted" style={{ fontSize: ".8rem", marginTop: ".15rem" }}>
                      <span className={`pill ${(r.difficulty ?? "").toLowerCase()}`} style={{ marginRight: ".5rem" }}>
                        {r.difficulty}
                      </span>
                      {r.topic} · {fmtDate(r.startedAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.4rem", flexShrink: 0 }}>
                    {done ? (
                      <span
                        style={{
                          fontSize: "1.3rem",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: scoreColor(r.score ?? 0),
                        }}
                      >
                        {r.score ?? "—"}
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: ".78rem" }}>
                        in progress
                      </span>
                    )}
                    {done ? (
                      <Link href={`/interview/${r.id}/report`} className="link-accent" style={{ fontSize: ".85rem" }}>
                        Report →
                      </Link>
                    ) : (
                      <Link href={`/interview/${r.id}`} className="link-accent" style={{ fontSize: ".85rem" }}>
                        Resume →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
