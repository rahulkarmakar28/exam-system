import { db } from "../config/db";
import { attempts, answers, questions, results, sections } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { isAdmin, isAuthenticated, MyContext } from "../middlewares/auth";

async function evaluateTest(_: unknown, { testId }: { testId: string }, context: MyContext) {
  isAdmin(context);

  // 1. fetch all attempts for this test
  const attRows = await db.select().from(attempts).where(eq(attempts.testId, testId));
  if (!attRows.length) throw new Error("No attempts found");

  const attemptIds = attRows.map(a => a.id);

  // 2. fetch all answers for these attempts in one go
  const ansRows = await db.select().from(answers).where(inArray(answers.attemptId, attemptIds));

  // 3. fetch all questions for this test
  const qRows = await db
    .select({ qid: questions.id, correctAnswer: questions.correctAnswer })
    .from(questions)
    .innerJoin(sections, eq(questions.sectionId, sections.id))
    .where(eq(sections.testId, testId));

  // build correct answer map
  const correctMap = new Map<string, number>();
  qRows.forEach(q => correctMap.set(q.qid, q.correctAnswer as number));
  const total = correctMap.size;

  // group answers by attemptId
  const answersByAttempt = new Map<string, typeof ansRows>();
  for (const a of ansRows) {
    if (!answersByAttempt.has(a.attemptId)) answersByAttempt.set(a.attemptId, []);
    answersByAttempt.get(a.attemptId)!.push(a);
  }

  // 4. evaluate all attempts in-memory
  const resultsData: any = [];
  const now = new Date();

  for (const att of attRows) {
    let correct = 0, wrong = 0, notAnswered = 0;
    const ansMap = new Map<string, any>();
    (answersByAttempt.get(att.id) || []).forEach(a => ansMap.set(a.questionId, a));

    for (const [qid, correctAnswer] of correctMap) {
      const a = ansMap.get(qid);
      if (!a || a.selectedOption == null) {
        notAnswered++;
      } else if (a.selectedOption === correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    }

    resultsData.push({
      attemptId: att.id,
      score: correct,
      total,
      correct,
      wrong,
      notAnswered,
    });
  }

  // 5. bulk insert results + bulk update attempts in a single transaction
  await db.transaction(async tx => {
    if (resultsData.length) {
      await tx.insert(results).values(resultsData);
    }

    await tx.update(attempts)
      .set({ isSubmitted: true, submittedAt: now })
      .where(inArray(attempts.id, attemptIds));
  });

  return resultsData;
}
async function getResult(_: unknown, { attemptId }: { attemptId: string }, context: MyContext) {
  isAuthenticated(context);

  const user = context.user!;

  // fetch attempt
  const [att] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
  if (!att) throw new Error("Attempt not found");

  // authorization: allow if it's this user's attempt OR user is admin
  if (att.userId !== String(user.id) && user.role !== "ADMIN") {
    throw new Error("Not authorized to view this result");
  }

  // fetch result
  const [res] = await db.select().from(results).where(eq(results.attemptId, attemptId));
  if (!res) {
    throw new Error("Result not available yet");
  }

  return res;
}


export {
  evaluateTest,
  getResult
}