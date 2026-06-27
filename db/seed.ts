import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  problems,
  submissions,
  interviewSessions,
  interviewAnswers,
  interviewReports,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Seeding problems…");

  // Clear dependents first (dev test data), then problems, so reseed is idempotent.
  await db.delete(interviewReports);
  await db.delete(interviewAnswers);
  await db.delete(interviewSessions);
  await db.delete(submissions);
  await db.delete(problems);

  await db.insert(problems).values([
    {
      title: "Two Sum",
      difficulty: "Easy",
      topic: "Arrays",
      description:
        "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`. You may assume that each input has exactly one solution, and you may not use the same element twice.",
      constraints:
        "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nExactly one valid answer exists.",
      optimalComplexity: "O(n) time, O(n) space",
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9." },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "nums[1] + nums[2] = 2 + 4 = 6." },
        { input: "nums = [3,3], target = 6", output: "[0,1]", explanation: "Both elements are used once." },
      ],
    },
    {
      title: "Valid Parentheses",
      difficulty: "Easy",
      topic: "Stack",
      description:
        "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets and in the correct order.",
      constraints: "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
      optimalComplexity: "O(n) time, O(n) space",
      examples: [
        { input: 's = "()"', output: "true", explanation: "Single matched pair." },
        { input: 's = "()[]{}"', output: "true", explanation: "All pairs matched in order." },
        { input: 's = "(]"', output: "false", explanation: "Mismatched bracket types." },
      ],
    },
    {
      title: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
      topic: "Sliding Window",
      description:
        "Given a string `s`, find the length of the longest substring without repeating characters.",
      constraints: "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.",
      optimalComplexity: "O(n) time, O(min(n, charset)) space",
      examples: [
        { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", length 3.' },
        { input: 's = "bbbbb"', output: "1", explanation: 'The answer is "b", length 1.' },
        { input: 's = "pwwkew"', output: "3", explanation: 'The answer is "wke", length 3.' },
      ],
    },
    {
      title: "Merge Two Sorted Lists",
      difficulty: "Easy",
      topic: "Linked List",
      description:
        "You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one sorted list by splicing together the nodes of the first two lists. Return the head of the merged linked list.",
      constraints:
        "The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.",
      optimalComplexity: "O(n + m) time, O(1) space",
      examples: [
        { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]", explanation: "Merged in sorted order." },
        { input: "list1 = [], list2 = []", output: "[]", explanation: "Both empty." },
        { input: "list1 = [], list2 = [0]", output: "[0]", explanation: "One empty list." },
      ],
    },
    {
      title: "Course Schedule",
      difficulty: "Medium",
      topic: "Graphs",
      description:
        "There are `numCourses` courses labeled 0 to numCourses-1. Given `prerequisites` where prerequisites[i] = [a, b] means you must take course b before course a, return true if you can finish all courses (i.e. the dependency graph has no cycle).",
      constraints:
        "1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000\nAll prerequisite pairs are unique.",
      optimalComplexity: "O(V + E) time, O(V + E) space",
      examples: [
        { input: "numCourses = 2, prerequisites = [[1,0]]", output: "true", explanation: "Take 0, then 1." },
        { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false", explanation: "Cyclic dependency." },
      ],
    },
    {
      title: "Climbing Stairs",
      difficulty: "Easy",
      topic: "DP",
      description:
        "You are climbing a staircase that takes `n` steps to reach the top. Each time you can climb either 1 or 2 steps. In how many distinct ways can you climb to the top?",
      constraints: "1 <= n <= 45",
      optimalComplexity: "O(n) time, O(1) space",
      examples: [
        { input: "n = 2", output: "2", explanation: "1+1, or 2." },
        { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, or 2+1." },
      ],
    },
    {
      title: "Coin Change",
      difficulty: "Medium",
      topic: "DP",
      description:
        "You are given an integer array `coins` representing coin denominations and an integer `amount`. Return the fewest number of coins needed to make up that amount. If it cannot be made, return -1. You have an infinite supply of each coin.",
      constraints:
        "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
      optimalComplexity: "O(amount * coins) time, O(amount) space",
      examples: [
        { input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1." },
        { input: "coins = [2], amount = 3", output: "-1", explanation: "Cannot make 3 with only 2s." },
      ],
    },
  ]);

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
