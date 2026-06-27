"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { advancePhase, saveInterviewCode } from "@/app/problems/[id]/actions";
import {
  saveAnswer,
  getFollowUp,
  runSilentCheckAction,
  generateReport,
} from "@/app/interview/actions";

type Phase =
  | "INTRO" | "APPROACH" | "TRANSITION_TO_CODE" | "CODING" | "SILENT_CHECK"
  | "DRY_RUN" | "COMPLEXITY" | "WRAP_UP" | "EVALUATION" | "COMPLETED";

type Lang = "javascript" | "python" | "cpp";

const STARTER: Record<Lang, string> = {
  javascript: "// Write your solution here\nfunction solve() {\n\n}\n",
  python: "# Write your solution here\ndef solve():\n    pass\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n\n    return 0;\n}\n",
};

const VISIBLE_PHASES: { key: Phase; label: string }[] = [
  { key: "INTRO", label: "Intro" },
  { key: "APPROACH", label: "Approach" },
  { key: "CODING", label: "Coding" },
  { key: "DRY_RUN", label: "Dry Run" },
  { key: "COMPLEXITY", label: "Complexity" },
  { key: "WRAP_UP", label: "Wrap Up" },
  { key: "EVALUATION", label: "Evaluation" },
];

const SCRIPT: Record<Phase, { title: string; line: string }> = {
  INTRO: { title: "Welcome", line: "Hey, welcome to your mock interview! Read the problem on the left, and whenever you're ready, hit Next to walk me through your approach." },
  APPROACH: { title: "Your Approach", line: "Before coding — how would you approach this? Type (or speak) your thinking below, then ask me for a follow-up or hit Next." },
  TRANSITION_TO_CODE: { title: "Sounds Good", line: "Good thinking. Go ahead and code it up — take your time." },
  CODING: { title: "Coding", line: "Write your solution in the editor. When you're done, hit Next and I'll take a quiet look." },
  SILENT_CHECK: { title: "Reviewing…", line: "Let me look over your code for a moment…" },
  DRY_RUN: { title: "Dry Run", line: "Let's trace through it together. Walk me through what your code does with a sample input." },
  COMPLEXITY: { title: "Complexity", line: "What's the time and space complexity? Could you do any better?" },
  WRAP_UP: { title: "Wrap Up", line: "Nice work. Anything you'd improve if you had more time?" },
  EVALUATION: { title: "Evaluation", line: "Thanks! Hit 'Finish & See Report' to generate your feedback across approach, code, and communication." },
  COMPLETED: { title: "Complete", line: "That's a wrap! Your report is ready." },
};

const SPEAKING_PHASES: Phase[] = ["APPROACH", "DRY_RUN", "COMPLEXITY", "WRAP_UP"];

const PHASE_ORDER: Phase[] = [
  "INTRO", "APPROACH", "TRANSITION_TO_CODE", "CODING", "SILENT_CHECK",
  "DRY_RUN", "COMPLEXITY", "WRAP_UP", "EVALUATION", "COMPLETED",
];

export default function InterviewRoom({
  sessionId,
  problem,
  initialPhase,
  initialCode,
  initialLanguage,
}: {
  sessionId: number;
  problem: { id: number; title: string; description: string; difficulty: string; topic: string };
  initialPhase: Phase;
  initialCode: string | null;
  initialLanguage: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [language, setLanguage] = useState<Lang>((initialLanguage as Lang) || "javascript");
  const [code, setCode] = useState<string>(initialCode || STARTER[(initialLanguage as Lang) || "javascript"]);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Voice scaffold
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setSpeaking(true);
    const t = setTimeout(() => setSpeaking(false), 3500);
    setFollowUp(null);
    setAnswer("");
    return () => clearTimeout(t);
  }, [phase]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const isCompleted = phase === "COMPLETED";
  const isSpeakingPhase = SPEAKING_PHASES.includes(phase);
  const editorActive = ["CODING", "DRY_RUN", "COMPLEXITY"].includes(phase);
  const isEval = phase === "EVALUATION";

  async function persistAnswer() {
    if (isSpeakingPhase && answer.trim()) {
      await saveAnswer({ sessionId, phase, transcript: answer });
    }
  }

  async function handleNext() {
    setBusy(true);
    try {
      await persistAnswer();
      if (editorActive) {
        await saveInterviewCode({ sessionId, code, language });
      }

      // Determine the phase we're moving INTO
      const idx = PHASE_ORDER.indexOf(phase);
      const next = PHASE_ORDER[idx + 1] ?? "COMPLETED";

      // CODING -> SILENT_CHECK -> DRY_RUN: run silent check, surface a hint
      if (next === "SILENT_CHECK") {
        await advancePhase(sessionId); // -> SILENT_CHECK
        const { hint: h } = await runSilentCheckAction({ sessionId, code, language });
        setHint(h);
        const { phase: p2 } = await advancePhase(sessionId); // -> DRY_RUN
        setPhase(p2 as Phase);
        return;
      }

      const { phase: p } = await advancePhase(sessionId);
      setPhase(p as Phase);
    } finally {
      setBusy(false);
    }
  }

  async function handleFollowUp() {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      await saveAnswer({ sessionId, phase, transcript: answer });
      const { question } = await getFollowUp({ sessionId, approach: answer });
      setFollowUp(question);
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setBusy(true);
    try {
      await persistAnswer();
      await generateReport(sessionId);
      router.push(`/interview/${sessionId}/report`);
    } finally {
      setBusy(false);
    }
  }

  function changeLang(l: Lang) {
    setLanguage(l);
    if (!code.trim() || code === STARTER[language]) setCode(STARTER[l]);
  }

  // ---- Voice loop: record → on stop, transcribe via Deepgram → fill answer ----
  async function transcribeBlob(blob: Blob) {
    setTranscribing(true);
    setVoiceMsg("Transcribing…");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });
      const data = await res.json();
      if (data.error && !data.transcript) {
        setVoiceMsg(data.error);
        return;
      }
      const text = (data.transcript || "").trim();
      if (text) {
        setAnswer((prev) => (prev ? prev + " " + text : text));
        setVoiceMsg("Added your spoken answer ✓");
      } else {
        setVoiceMsg("Didn't catch any speech — try again.");
      }
    } catch {
      setVoiceMsg("Transcription request failed.");
    } finally {
      setTranscribing(false);
    }
  }

  async function toggleMic() {
    if (micOn) {
      mediaRef.current?.stop();
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
      setMicOn(false);
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        if (blob.size > 0) await transcribeBlob(blob);
      };
      mediaRef.current = mr;
      setMicOn(true);
      setVoiceMsg("Mic on. Hit Record, speak your answer, then Stop — it'll be transcribed into the box.");
    } catch {
      setVoiceMsg("Microphone permission denied or unavailable.");
    }
  }

  function toggleRecording() {
    if (!micOn) {
      setVoiceMsg("Turn the mic on first.");
      return;
    }
    if (recording) {
      mediaRef.current?.stop(); // triggers onstop -> transcribe
      setRecording(false);
    } else {
      chunksRef.current = [];
      mediaRef.current?.start();
      setRecording(true);
      setVoiceMsg("Recording… speak your answer.");
    }
  }

  const script = SCRIPT[phase];
  const activeStepIndex = VISIBLE_PHASES.findIndex(
    (s) => s.key === phase ||
      (phase === "TRANSITION_TO_CODE" && s.key === "CODING") ||
      (phase === "SILENT_CHECK" && s.key === "CODING")
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-sm font-bold">AI</div>
          <div>
            <div className="text-sm font-semibold leading-tight">{problem.title}</div>
            <div className="text-[11px] text-zinc-400">{problem.difficulty} · {problem.topic}</div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {VISIBLE_PHASES.map((s, i) => {
            const done = i < activeStepIndex;
            const active = i === activeStepIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div className={["px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  active ? "bg-indigo-500 text-white" : done ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"].join(" ")}>
                  {s.label}
                </div>
                {i < VISIBLE_PHASES.length - 1 && (
                  <div className={["h-px w-3", done ? "bg-emerald-500/40" : "bg-zinc-700"].join(" ")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-zinc-400 font-mono">{mm}:{ss}</span>
          <button onClick={() => router.push("/problems")} className="text-xs text-zinc-400 hover:text-zinc-200">Exit</button>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT */}
        <aside className="w-[36%] min-w-[320px] max-w-[500px] flex flex-col border-r border-zinc-800 bg-zinc-900/40">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <section>
              <h2 className="text-base font-semibold mb-1">{problem.title}</h2>
              <div className="flex gap-2 mb-3">
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">{problem.difficulty}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{problem.topic}</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{problem.description}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Examples</h3>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-xs text-zinc-400 min-h-[84px]">
                <div className="text-zinc-600 italic">Sample input / output will appear here.</div>
              </div>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Constraints</h3>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400 min-h-[56px]">
                <div className="text-zinc-600 italic">Constraints will appear here.</div>
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT */}
        <main className="flex-1 min-w-0 flex flex-col relative">
          {/* Interviewer card */}
          <div className="absolute top-4 right-4 z-10 w-52">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 backdrop-blur shadow-xl overflow-hidden">
              <div className="relative h-28 bg-gradient-to-br from-indigo-600/30 to-fuchsia-600/30 grid place-items-center">
                <div className={["h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 grid place-items-center text-2xl transition-transform", speaking ? "scale-105" : "scale-100"].join(" ")}>🧑‍💼</div>
                {speaking && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />speaking
                  </span>
                )}
              </div>
              <div className="px-3 py-2">
                <div className="text-xs font-semibold">AI Interviewer</div>
                <div className="text-[10px] text-zinc-400">{script.title}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 pr-60 space-y-4">
            {/* Interviewer line */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
              <p className="text-sm text-indigo-100 leading-relaxed">{script.line}</p>
            </div>

            {/* Follow-up / hint */}
            {followUp && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-amber-300 mb-1">Follow-up</div>
                <p className="text-sm text-amber-100">{followUp}</p>
              </div>
            )}
            {hint && phase === "DRY_RUN" && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-sky-300 mb-1">Interviewer asks</div>
                <p className="text-sm text-sky-100">{hint}</p>
              </div>
            )}

            {/* Answer box for speaking phases */}
            {isSpeakingPhase && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    transcribing
                      ? "Transcribing your speech…"
                      : "Type your answer, or use the mic below to speak it…"
                  }
                  className="w-full h-28 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none"
                />
                {phase === "APPROACH" && (
                  <div className="flex justify-end">
                    <button onClick={handleFollowUp} disabled={busy || !answer.trim()}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:opacity-40">
                      {busy ? "…" : "Ask interviewer for a follow-up"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Editor */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[360px]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
                <select value={language} onChange={(e) => changeLang(e.target.value as Lang)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs">
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                </select>
                <span className={["text-[11px]", editorActive ? "text-emerald-400" : "text-zinc-500"].join(" ")}>
                  {editorActive ? "● editor active" : "editor read-only this phase"}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <Editor height="100%" language={language} value={code}
                  onChange={(v) => setCode(v ?? "")} theme="vs-dark"
                  options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, readOnly: !editorActive, padding: { top: 12 } }} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom control bar */}
      <footer className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <button onClick={toggleMic}
            className={["flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              micOn ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"].join(" ")}>
            <span>{micOn ? "🎤" : "🔇"}</span>{micOn ? "Mic on" : "Mic off"}
          </button>
          <button onClick={() => setCamOn((v) => !v)}
            className={["flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              camOn ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"].join(" ")}>
            <span>{camOn ? "📹" : "🚫"}</span>{camOn ? "Video on" : "Video off"}
          </button>
          <button onClick={toggleRecording}
            className={["flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              recording ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"].join(" ")}>
            <span className={["h-2 w-2 rounded-full", recording ? "bg-red-500 animate-pulse" : "bg-zinc-500"].join(" ")} />
            {recording ? "Recording" : "Record"}
          </button>
          {voiceMsg && <span className="ml-2 text-[10px] text-zinc-500 max-w-[280px] truncate">{voiceMsg}</span>}
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <button onClick={() => router.push(`/interview/${sessionId}/report`)}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-400">
              See Report
            </button>
          ) : isEval ? (
            <button onClick={handleFinish} disabled={busy}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50">
              {busy ? "Generating…" : "Finish & See Report"}
            </button>
          ) : (
            <>
              <button onClick={handleFinish} disabled={busy}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50">
                End early
              </button>
              <button onClick={handleNext} disabled={busy}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50">
                {busy ? "…" : "Next →"}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
