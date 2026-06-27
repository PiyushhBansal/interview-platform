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
  if (n >= 80) return { label: "Strong", color: "#6ee7b7" };
  if (n >= 55) return { label: "Decent", color: "#fbbf24" };
  return { label: "Needs work", color: "#fb7185" };
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

  const scores = report.scores as Scores;
  const overall = band(scores.overall);
  const radarData = DIM_LABELS.map((d) => ({ dimension: d.label, score: scores[d.key] }));

  return (
    <div className="app-dark">
      <main className="container" style={{ maxWidth: 880 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
          <Link href="/dashboard" className="muted" style={{ fontSize: ".85rem", textDecoration: "none" }}>← Dashboard</Link>
          <Link href="/history" className="muted" style={{ fontSize: ".85rem", textDecoration: "none" }}>History →</Link>
        </div>

        <span className="eyebrow">Evaluation</span>
        <h1 className="page-title" style={{ marginTop: ".4rem" }}>Interview Report</h1>
        <p className="page-sub" style={{ marginBottom: "2rem" }}>{problem?.title} · {problem?.difficulty}</p>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="report-top">
          <div className="card" style={{ padding: "1.8rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "3.6rem", fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{scores.overall}</div>
            <div className="muted" style={{ fontSize: ".85rem" }}>/ 100 overall</div>
            <div style={{ marginTop: ".5rem", fontWeight: 600, fontSize: ".9rem", color: overall.color }}>{overall.label}</div>
          </div>
          <div className="card" style={{ padding: "1rem" }}>
            <ScoreRadar data={radarData} />
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="eyebrow" style={{ marginBottom: "1.2rem" }}>Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {DIM_LABELS.map((d) => {
              const v = scores[d.key];
              return (
                <div key={d.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".88rem", marginBottom: ".35rem" }}>
                    <span>{d.label}</span>
                    <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
                  </div>
                  <div className="track"><div className="fill" style={{ width: `${v}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="eyebrow" style={{ marginBottom: ".8rem" }}>🤖 Interviewer feedback</h2>
          <div style={{ fontSize: ".92rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }} className="muted">
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
