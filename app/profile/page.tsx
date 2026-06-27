import { db } from "@/lib/db";
import { interviewSessions, submissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();

  const sessions = await db
    .select({
      score: interviewSessions.totalScore,
      phase: interviewSessions.currentPhase,
    })
    .from(interviewSessions)
    .where(eq(interviewSessions.userId, userId));

  const subs = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.userId, userId));

  const completed = sessions.filter((s) => s.score != null);
  const avg =
    completed.length > 0
      ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
      : null;
  const best = completed.reduce((m, s) => Math.max(m, s.score ?? 0), 0);

  const name =
    user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress || "there";
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "—";
  const since = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";
  const initial = (name?.[0] ?? "U").toUpperCase();

  return (
    <div className="app-dark">
      <main className="container" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Your account</span>
        <h1 className="page-title" style={{ marginTop: ".5rem", marginBottom: "2rem" }}>
          Profile
        </h1>

        {/* Identity card */}
        <div className="card" style={{ padding: "1.8rem", display: "flex", alignItems: "center", gap: "1.3rem", marginBottom: "1.5rem" }}>
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt=""
              width={72}
              height={72}
              style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                fontSize: "1.8rem",
                fontWeight: 800,
                background: "radial-gradient(circle at 30% 25%, var(--cyan), var(--violet-deep))",
              }}
            >
              {initial}
            </div>
          )}
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-.02em" }}>{name}</div>
            <div className="muted" style={{ fontSize: ".9rem" }}>{email}</div>
            <div className="muted" style={{ fontSize: ".8rem", marginTop: ".3rem" }}>Member since {since}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="card stat"><div className="num">{sessions.length}</div><div className="lbl">Interviews</div></div>
          <div className="card stat"><div className="num">{completed.length}</div><div className="lbl">Completed</div></div>
          <div className="card stat"><div className="num">{avg ?? "—"}</div><div className="lbl">Avg score</div></div>
          <div className="card stat"><div className="num">{completed.length ? best : "—"}</div><div className="lbl">Best score</div></div>
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="muted" style={{ fontSize: ".85rem", marginBottom: "1rem" }}>
            {subs.length} coding solution{subs.length === 1 ? "" : "s"} submitted for AI review.
          </div>
          <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="abtn ghost">View dashboard</Link>
            <Link href="/history" className="abtn ghost">Interview history</Link>
            <Link href="/problems" className="abtn">New interview →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
