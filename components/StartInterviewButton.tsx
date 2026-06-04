"use client"

import { useState } from "react"
import { useRouter } from "next/navigation";
import { startInterview } from "@/app/problems/[id]/actions"

export default function StartInterviewButton({ problemId }: {problemId: number}){
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleStart() {
        setLoading(true);
        const {sessionId} = await startInterview({problemId});
        router.push(`/interview/${sessionId}`);
    }

    return(
        <button onClick={handleStart} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "starting..." : "Start Mock Interview"}
        </button>
    )
}