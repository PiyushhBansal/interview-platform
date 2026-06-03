import { db } from "@/lib/db";
import { problems } from "@/db/schema";
import Link from "next/link";


export default async function ProblemsPage() {
    const allProblems = await db.select().from(problems);
    return (
        <main className="p-8 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Problems</h1>
            <ul className="space-y-4">
                {allProblems.map((p)=>(
                    <li key={p.id}>
                        <Link 
                            href={`/problems/${p.id}`}
                            className="block p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">{p.title}</h2>
                            <span className="text-sm text-zinc-500">
                                {p.difficulty} · {p.topic}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {p.description}
                        </p>
                    </Link>
                </li>
                ))}
            </ul>
        </main>
    )
}

