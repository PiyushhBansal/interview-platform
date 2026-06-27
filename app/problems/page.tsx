import { db } from "@/lib/db";
import { problems } from "@/db/schema";
import RandomInterviewButton from "@/components/RandomInterviewButton";
import ProblemBrowser from "@/components/ProblemBrowser";

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

        <ProblemBrowser
          problems={allProblems.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty,
            topic: p.topic,
          }))}
        />
      </main>
    </div>
  );
}
