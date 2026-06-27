"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startInterviewOn } from "@/app/interview/actions";

export default function RandomInterviewButton({
  className = "abtn",
  label = "Start with a random question",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const { sessionId } = await startInterviewOn();
      router.push(`/interview/${sessionId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button onClick={go} disabled={loading} className={className}>
      {loading ? "Starting…" : <>🎲 {label}</>}
    </button>
  );
}
