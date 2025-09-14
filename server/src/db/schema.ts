import { pgTable, serial, varchar, text, integer, uuid, timestamp, boolean } from "drizzle-orm/pg-core";


export const users = pgTable("users", {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }),
    email: varchar("email", { length: 150 }).notNull().unique(),
    password: text().notNull(),
    role: varchar("role", { length: 20 }).default("STUDENT"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const tests = pgTable("tests", {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    duration: integer("duration").notNull(), // global duration in minutes
    createdAt: timestamp("created_at").defaultNow(),
});

export const sections = pgTable("sections", {
    id: uuid('id').defaultRandom().primaryKey(),
    testId: uuid("test_id").references(() => tests.id, { onDelete: "cascade"}).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    duration: integer("duration"), // optional if per section timer
});

export const questions = pgTable("questions", {
    id: uuid('id').defaultRandom().primaryKey(),
    sectionId: uuid("section_id").references(() => sections.id, { onDelete: "cascade"}).notNull(),
    text: text("text").notNull(),
    options: text("options").array(), // ["A", "B", "C", "D"]
    correctAnswer: integer("correct_answer"), // index of correct option
});

export const attempts = pgTable("attempts", {
    id: uuid('id').defaultRandom().primaryKey(),
    testId: uuid("test_id").references(() => tests.id, { onDelete: "cascade"}).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade"}).notNull(),
    startedAt: timestamp("started_at").defaultNow(),
    submittedAt: timestamp("submitted_at"),
    isSubmitted: boolean("is_submitted").default(false),
});

export const answers = pgTable("answers", {
    id: uuid('id').defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").references(() => attempts.id, { onDelete: "cascade"}).notNull(),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade"}).notNull(),
    selectedOption: integer("selected_option"), // index of chosen option
    markedForReview: boolean("marked_for_review").default(false),
});

export const results = pgTable("results", {
    id: uuid('id').defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").references(() => attempts.id, { onDelete: "cascade"}).notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    correct: integer("correct").notNull(),
    wrong: integer("wrong").notNull(),
    notAnswered: integer("not_answered").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});