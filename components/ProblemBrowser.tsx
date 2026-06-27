"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Problem = {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  topic: string;
};

export default function ProblemBrowser({ problems }: { problems: Problem[] }) {
  const [difficulty, setDifficulty] = useState<string>("All");
  const [topic, setTopic] = useState<string>("All");

  const topics = useMemo(
    () => ["All", ...Array.from(new Set(problems.map((p) => p.topic))).sort()],
    [problems]
  );
  const difficulties = ["All", "Easy", "Medium", "Hard"];

  const filtered = problems.filter(
    (p) =>
      (difficulty === "All" || p.difficulty === difficulty) &&
      (topic === "All" || p.topic === topic)
  );

  const chip = (active: boolean) =>
    ({
      padding: ".4rem .9rem",
      borderRadius: "99px",
      fontSize: ".82rem",
      fontWeight: 600,
      cursor: "pointer",
      border: "1px solid var(--line)",
      transition: "all .2s",
      background: active ? "linear-gradient(120deg, var(--violet-deep), var(--violet))" : "transparent",
      color: active ? "#fff" : "var(--muted)",
    }) as React.CSSProperties;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: ".9rem", marginBottom: "1.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: ".75rem", width: 70, textTransform: "uppercase", letterSpacing: ".1em" }}>Difficulty</span>
          {difficulties.map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} style={chip(difficulty === d)}>{d}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: ".75rem", width: 70, textTransform: "uppercase", letterSpacing: ".1em" }}>Topic</span>
          {topics.map((t) => (
            <button key={t} onClick={() => setTopic(t)} style={chip(topic === t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="muted" style={{ fontSize: ".82rem", marginBottom: "1rem" }}>
        {filtered.length} problem{filtered.length === 1 ? "" : "s"}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <p className="muted">No problems match these filters.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", display: "grid", gap: "1rem" }}>
          {filtered.map((p) => (
            <li key={p.id}>
              <Link href={`/problems/${p.id}`} className="card hoverable" style={{ display: "block", padding: "1.3rem 1.5rem", textDecoration: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-.02em" }}>{p.title}</h2>
                  <div style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                    <span className={`pill ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    <span className="pill">{p.topic}</span>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: ".9rem", marginTop: ".5rem", lineHeight: 1.55 }}>{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
