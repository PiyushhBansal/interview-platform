import { config } from "dotenv";           // 1. run
config({ path: ".env.local" });            // ← code runs LATER
import { db } from "@/lib/db";             // 2. run (triggers lib/db.ts execution)
import { problems } from "@/db/schema";    // 3. run

async function seed() {
  console.log("Seeding problems...");

  await db.insert(problems).values([
    {
      title: "Two Sum",
      description: "Given an array of integers, return indices of the two numbers that add up to a target.",
      difficulty: "Easy",
      topic: "Arrays",
    },
    {
      title: "Valid Parentheses",
      description: "Determine if a string of brackets is balanced.",
      difficulty: "Easy",
      topic: "Stack",
    },
    {
      title: "Longest Substring Without Repeating Characters",
      description: "Find the length of the longest substring without duplicate characters.",
      difficulty: "Medium",
      topic: "Sliding Window",
    },
    {
      title: "Merge Two Sorted Lists",
      description: "Merge two sorted linked lists into one sorted list.",
      difficulty: "Easy",
      topic: "Linked List",
    },
    {
      title: "Course Schedule",
      description: "Given prerequisites, determine if all courses can be finished.",
      difficulty: "Medium",
      topic: "Graphs",
    },
  ]);

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
