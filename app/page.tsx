import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-5xl font-bold tracking-tight text-center">
        AI Interview Platform
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center max-w-xl">
        Practice coding. Explain verbally. Get ML-scored feedback.
      </p>
    </main>
  );
}
