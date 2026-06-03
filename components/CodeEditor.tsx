"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { submitSolution } from "@/app/problems/[id]/actions";
import { reviewCode } from "@/app/problems/[id]/actions";

const starter_code: Record<"javascript" | "python" | "cpp", string> = {
  javascript: "// Write your solution here\nconsole.log('Hello from JS');\n",
  python: "# Write your solution here\nprint('Hello from Python')\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello from C++\" << endl;\n    return 0;\n}\n",
};

export default function CodeEditor({ problemId }: { problemId: number }) {
  const [language, setLanguage] = useState<"javascript" | "python" | "cpp">("javascript");
  const [code, setCode] = useState<string>(starter_code.javascript);
  const [status, setStatus] = useState<"idle" | "submitting"| "reviewing" | "done">("idle");
  const [review,setReview] = useState<string| null>(null);

  function handleLanguageChange(newLang: "javascript" | "python" | "cpp") {
    setLanguage(newLang);
    setCode(starter_code[newLang]);
  }

  async function handleSubmit() {
    setStatus("submitting");
    setReview(null);
    const submitResult = await submitSolution({ problemId, code, language });
    setStatus("reviewing");
    const reviewResult = await reviewCode(submitResult.id);
    setReview(reviewResult.review);
    setStatus("done");
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-zinc-50 dark:bg-zinc-900">
        <select
          value={language}
          onChange={(e) =>
            handleLanguageChange(e.target.value as "javascript" | "python" | "cpp")
          }
          className="border rounded px-2 py-1 text-sm bg-white dark:bg-zinc-800"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
        </select>
        <span className="text-xs text-zinc-500">Problem #{problemId}</span>
      </div>

      <Editor
        height="400px"
        language={language}
        value={code}
        onChange={(v) => setCode(v ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />

      <div className="flex items-center justify-between p-3 border-t bg-zinc-50 dark:bg-zinc-900">
        <span className="text-xs text-zinc-500">
          {status === "idle" && "Ready"}
          {status === "submitting" && "Submitting..."}
          {status === "done" && "Submitted ✓"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={status === "submitting"}
          className="px-4 py-1.5 bg-black text-white rounded text-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          Submit Solution
        </button>
      </div>
      {review && (
        <div className="p-4 border-t bg-blue-50 dark:bg-blue-950/30 text-sm whitespace-pre-wrap">
          <div className="font-semibold mb-2">🤖 AI Code Review</div>
          {review}
        </div>
      )}
    </div>
  );
}
