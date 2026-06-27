import { db } from "@/lib/db";
import { problems } from "@/db/schema";
import Link from "next/link";
import RandomInterviewButton from "@/components/RandomInterviewButton";

export default async function ProblemsPage() {
  const allProblems = await db.select().from(problems);

  return (
    <div className="app-dark">
      <main className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div>
            <span className="eyebrow">Choose your challenge</span>
            <h1 className="page-title" style={{ marginTop: ".5rem" }}>
              Problems
            </h1>
            <p className="page-sub">
              Pick a question to interview on — or let us surprise you.
            </p>
          </div>
          <RandomInterviewButton />
        </div>

        <ul style={{ listStyle: "none", display: "grid", gap: "1rem" }}>
          {allProblems.map((p) => (
            <li key={p.id}>
              <Link
                href={`/problems/${p.id}`}
                className="card hoverable"
                style={{ display: "block", padding: "1.3rem 1.5rem", textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-.02em" }}>
                    {p.title}
                  </h2>
                  <div style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                    <span className={`pill ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    <span className="pill">{p.topic}</span>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: ".9rem", marginTop: ".5rem", lineHeight: 1.55 }}>
                  {p.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
