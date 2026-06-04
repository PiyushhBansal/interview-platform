import {db} from "@/lib/db";
import {problems} from "@/db/schema";
import {eq} from "drizzle-orm";
import {notFound} from "next/navigation";
import CodeEditor from "@/components/CodeEditor";
import StartInterviewButton from "@/components/StartInterviewButton";


export default async function ProblemDetailPage({
    params,
}: {
    params: Promise<{id : string}>
}) {
    const {id} = await params;
    const problemId = Number(id);
    if(Number.isNaN(problemId)) {
        notFound();
    }

    const [problem] = await db
        .select()
        .from(problems)
        .where(eq(problems.id, problemId));

    if(!problem) {
        notFound();
    }
    return(
        <main className="p-8 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">{problem.title}</h1>
                <p className="text-sm text-zinc-500 mb-6">
                    {problem.difficulty} · {problem.topic}
                </p>
                <p className="text-base leading-relaxed">{problem.description}</p>
                                <div className="my-6">
                    <StartInterviewButton problemId={problem.id} />
                </div>
                <CodeEditor problemId={problem.id} />
        </main>
    )
}
