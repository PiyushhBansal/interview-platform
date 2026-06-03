import { pgTable, serial, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";

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
  problemId: integer("problem_id").notNull().references(() => problems.id),
  code: text("code").notNull(),
  language: varchar("language", { length: 20 }).notNull(),
  aiReview: text("ai_review"),  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});