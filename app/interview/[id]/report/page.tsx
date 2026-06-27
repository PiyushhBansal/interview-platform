import { db } from "@/lib/db";
import { interviewSessions, interviewReports, problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import ScoreRadar from "@/components/ScoreRadar";

type Categories = {
  problemUnderstanding: number;
  approachCommunication: number;
  correctness: number;
  complexityAnalysis: number;
  optimization: number;
  codeQuality: number;
};

type ReportScores = {
  categories: Categories;
  overall: number;
  rating: string;
  strengths: string[];
  weaknesses: string[];
};

const CATS: { key: keyof Categories; label: string }[] = [
  { key: "problemUnderstanding", label: "Problem Understanding" },
  { key: "approachCommunication", label: "Approach & Communication" },
  { key: "correctness", label: "Correctness" },
  { key: "complexityAnalysis", label: "Complexity Analysis" },
  { key: "optimization", label: "Optimization" },
  { key: "codeQuality", label: "Code Quality" },
];

function color(n: number) {
  if (n >= 8) return "#6ee7b7";
  if (n >= 5) return "#fbbf24";
  return "#fb7185";
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

  const [problem] = await db.select().from(problems).where(eq(problems.id, session.problemId));
  const [report] = await db
    .select()
    .from(interviewReports)
    .where(eq(interviewReports.sessionId, sessionId));

  if (!report) {
    return (
      <div className="app-dark">
        <main className="container" style={{ textAlign: "center", maxWidth: 640 }}>
          <h1 className="page-title">Report not ready</h1>
          <p className="page-sub" style={{ marginBottom: "1.5rem" }}>
            This interview doesn&apos;t have a generated report yet.
          </p>
          <Link href={`/interview/${sessionId}`} className="abtn">← Back to interview</Link>
        </main>
      </div>
    );
  }

  const s = report.scores as ReportScores;
  const cats = s.categories;
  const radarData = CATS.map((c) => ({ dimension: c.label.split(" ")[0], score: (cats[c.key] ?? 0) * 10 }));

  return (
    <div className="app-dark">
      <main className="container" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
          <Link href="/dashboard" className="muted" style={{ fontSize: ".85rem", textDecoration: "none" }}>← Dashboard</Link>
          <Link href="/history" className="muted" style={{ fontSize: ".85rem", textDecoration: "none" }}>History →</Link>
        </div>

        <span className="eyebrow">Evaluation</span>
        <h1 className="page-title" style={{ marginTop: ".4rem" }}>Report Card</h1>
        <p className="page-sub" style={{ marginBottom: "2rem" }}>{problem?.title} · {problem?.difficulty}</p>

        {/* Overall + rating + radar */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="report-top">
          <div className="card" style={{ padding: "1.8rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "3.6rem", fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: color(s.overall) }}>
              {s.overall}<span style={{ fontSize: "1.4rem", color: "var(--muted-2)" }}>/10</span>
            </div>
            <div style={{ marginTop: ".8rem", fontWeight: 700, fontSize: "1rem" }}>{s.rating}</div>
            <div className="muted" style={{ fontSize: ".78rem", marginTop: ".2rem" }}>overall rating</div>
          </div>
          <div className="card" style={{ padding: "1rem" }}>
            <ScoreRadar data={radarData} />
          </div>
        </div>

        {/* 6 categories */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="eyebrow" style={{ marginBottom: "1.2rem" }}>Category Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {CATS.map((c) => {
              const v = cats[c.key] ?? 0;
              return (
                <div key={c.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem", marginBottom: ".4rem" }}>
                    <span>{c.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: color(v) }}>{v}/10</span>
                  </div>
                  <div className="track"><div className="fill" style={{ width: `${v * 10}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths + weaknesses */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="report-top">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 className="eyebrow" style={{ marginBottom: "1rem", color: "#6ee7b7" }}>✓ Strengths</h2>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".7rem" }}>
              {(s.strengths?.length ? s.strengths : ["—"]).map((t, i) => (
                <li key={i} style={{ fontSize: ".9rem", lineHeight: 1.5, paddingLeft: "1.1rem", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#6ee7b7" }}>•</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 className="eyebrow" style={{ marginBottom: "1rem", color: "#fb7185" }}>△ To Improve</h2>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".7rem" }}>
              {(s.weaknesses?.length ? s.weaknesses : ["—"]).map((t, i) => (
                <li key={i} style={{ fontSize: ".9rem", lineHeight: 1.5, paddingLeft: "1.1rem", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#fb7185" }}>•</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feedback */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="eyebrow" style={{ marginBottom: ".8rem" }}>🤖 Interviewer Feedback</h2>
          <div className="muted" style={{ fontSize: ".95rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {report.feedback}
          </div>
        </div>

        <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap" }}>
          <Link href={`/problems/${session.problemId}`} className="abtn">Try this problem again</Link>
          <Link href="/dashboard" className="abtn ghost">View dashboard</Link>
        </div>
      </main>
    </div>
  );
}
