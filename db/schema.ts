import { pgTable, serial, text, varchar, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const interviewPhaseEnum = pgEnum("interview_phase", [
  "INTRO",
  "APPROACH",
  "TRANSITION_TO_CODE",
  "CODING",
  "SILENT_CHECK",
  "DRY_RUN",
  "COMPLEXITY",
  "WRAP_UP",
  "EVALUATION",
  "COMPLETED",
]);

export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(),
  topic: varchar("topic", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  problemId: integer("problem_id").notNull().references(() => problems.id),
  code: text("code").notNull(),
  language: varchar("language", { length: 20 }).notNull(),
  aiReview: text("ai_review"),  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  problemId: integer("problem_id").notNull().references(() => problems.id),
  currentPhase: interviewPhaseEnum("current_phase").notNull().default("INTRO"),
  finalCode: text("final_code"),
  language: varchar("language", { length: 20 }),
  silentCheck: jsonb("silent_check"),
  totalScore: integer("total_score"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});