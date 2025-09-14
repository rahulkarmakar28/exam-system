import { db } from "../config/db";
import { tests, attempts, answers, sections, questions } from "../db/schema";
import { isAdmin, MyContext } from "../middlewares/auth";
import { eq, inArray, and } from "drizzle-orm";
import { isAuthenticated } from "../middlewares/auth";



async function getAllTests(_: unknown, __: any, context: MyContext) {
  isAuthenticated(context);
  return await db.select().from(tests);
}
async function getTestById(_: unknown, { id }: { id: string }, context: MyContext) {
  isAuthenticated(context)
  const [t] = await db.select().from(tests).where(eq(tests.id, id));
  return t || null;
}



async function startTest(_: any, { testId }: { testId: string }, context: MyContext) {
  isAuthenticated(context);
  const user = context.user!;

  const [existing] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.testId, testId), eq(attempts.userId, user.id)));

  if (existing) throw new Error("You have already started this test");

  const [attempt] = await db.insert(attempts)
    .values({ testId, userId: user.id })
    .returning();

  return attempt;
}
async function saveOrUpdateAnswer(_: unknown, { attemptId, questionId, selectedOption, markedForReview }: { attemptId: string, questionId: string, selectedOption: number | null, markedForReview: boolean }, context: MyContext) {
  isAuthenticated(context)

  await db.insert(answers).values({
    attemptId, questionId, selectedOption, markedForReview
  }).onConflictDoUpdate({
    target: [answers.attemptId, answers.questionId],
    set: { selectedOption, markedForReview }
  });
  return true;
}
async function submitTest(_: any, { attemptId }: { attemptId: string }, context: MyContext) {
  isAuthenticated(context);
  await db.update(attempts).set({ isSubmitted: true }).where(eq(attempts.id, attemptId));
  return true;
}



async function createTest(_: unknown, payload: any, context: MyContext) {
  isAdmin(context);

  const input = payload.data;

  return await db.transaction(async (tx) => {
    // 1. Insert test
    const [t] = await tx.insert(tests).values({
      title: input.title,
      description: input.description,
      duration: input.duration,
    }).returning();

    // 2. Insert sections
    const sectionValues = input.sections.map((sec: any) => ({
      testId: t.id,
      name: sec.name,
      duration: sec.duration ?? null,
    }));

    const insertedSections = await tx.insert(sections)
      .values(sectionValues)
      .returning();

    // 3. Insert questions
    const questionValues = input.sections.flatMap((sec: any, idx: number) => {
      const sectionId = insertedSections[idx].id;
      return sec.questions.map((q: any) => ({
        sectionId,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));
    });

    if (questionValues.length > 0) {
      await tx.insert(questions).values(questionValues);
    }

    return t;
  });
}
async function updateTest (_: unknown, args: any, context: MyContext) {
  isAdmin(context);

  const input = args.data;

  return await db.transaction(async (tx) => {
    // 1. Update test itself
    const updateFields: any = {};
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.duration !== undefined) updateFields.duration = input.duration;

    let updatedTest = null;
    if (Object.keys(updateFields).length > 0) {
      [updatedTest] = await tx.update(tests)
        .set(updateFields)
        .where(eq(tests.id, args.id))
        .returning();
    } else {
      // just fetch test if no test-level fields updated
      [updatedTest] = await tx.select().from(tests).where(eq(tests.id, args.id));
    }

    // 2. Update sections
    if (input.sections && input.sections.length > 0) {
      for (const sec of input.sections) {
        if (sec.id) {
          // existing section -> update
          const sectionUpdate: any = {};
          if (sec.name !== undefined) sectionUpdate.name = sec.name;
          if (sec.duration !== undefined) sectionUpdate.duration = sec.duration;

          if (Object.keys(sectionUpdate).length > 0) {
            await tx.update(sections)
              .set(sectionUpdate)
              .where(eq(sections.id, sec.id));
          }

          // 3. Update questions inside this section
          if (sec.questions && sec.questions.length > 0) {
            for (const q of sec.questions) {
              if (q.id) {
                // existing question -> update
                const questionUpdate: any = {};
                if (q.text !== undefined) questionUpdate.text = q.text;
                if (q.options !== undefined) questionUpdate.options = q.options;
                if (q.correctAnswer !== undefined) questionUpdate.correctAnswer = q.correctAnswer;

                if (Object.keys(questionUpdate).length > 0) {
                  await tx.update(questions)
                    .set(questionUpdate)
                    .where(eq(questions.id, q.id));
                }
              } else {
                // new question -> insert
                await tx.insert(questions).values({
                  sectionId: sec.id,
                  text: q.text,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                });
              }
            }
          }

        } else {
          // new section -> insert + its questions
          const [newSection] = await tx.insert(sections)
            .values({
              testId: args.id,
              name: sec.name,
              duration: sec.duration ?? null,
            })
            .returning();

          if (sec.questions && sec.questions.length > 0) {
            const questionValues = sec.questions.map((q: any) => ({
              sectionId: newSection.id,
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
            }));
            await tx.insert(questions).values(questionValues);
          }
        }
      }
    }

    return updatedTest;
  });
};
async function deleteTest(_: unknown, { id }: { id: string }, context: MyContext) {
  isAdmin(context);

  return await db.transaction(async (tx) => {
    // 1. Find all sections for this test
    const secs = await tx.select({ id: sections.id })
      .from(sections)
      .where(eq(sections.testId, id));

    if (secs.length > 0) {
      const sectionIds = secs.map((s) => s.id);

      // 2. Delete all questions from these sections (delete many)
      await tx.delete(questions).where(inArray(questions.sectionId, sectionIds));

      // 3. Delete all sections for this test
      await tx.delete(sections).where(inArray(sections.id, sectionIds));
    }

    // 4. Delete the test itself
    await tx.delete(tests).where(eq(tests.id, id));

    return true;
  });
}



async function deleteSection(_: unknown, { ids }: { ids: string[] }, context: MyContext) {
  isAdmin(context);

  await db.transaction(async (tx) => {
    // 1. Delete all questions belonging to these sections
    await tx.delete(questions).where(inArray(questions.sectionId, ids));

    // 2. Delete all sections
    await tx.delete(sections).where(inArray(sections.id, ids));
  });

  return true;
}
async function deleteQuestion(_: unknown, { ids }: { ids: string[] }, context: MyContext) {
  isAdmin(context)

  await db.delete(questions).where(inArray(questions.id, ids));
  return true;
}



export {
  getAllTests,
  getTestById,

  startTest,
  saveOrUpdateAnswer,
  submitTest,

  createTest,
  updateTest,
  deleteTest,

  deleteSection,
  deleteQuestion,
}