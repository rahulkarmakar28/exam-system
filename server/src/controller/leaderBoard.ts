import { db } from "../config/db";
import { results, attempts, users } from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { isAuthenticated, MyContext } from "../middlewares/auth";

async function getLeaderboard(_: unknown, { testId }: { testId: string }, context: MyContext) {
    isAuthenticated(context);

    const rows = await db
        .select({
            userId: attempts.userId,
            name: users.name,
            score: results.score,
            total: results.total,
            correct: results.correct,
            wrong: results.wrong,
            notAnswered: results.notAnswered,
            submittedAt: attempts.submittedAt
        })
        .from(results)
        .innerJoin(attempts, eq(results.attemptId, attempts.id))
        .innerJoin(users, eq(users.id, attempts.userId))
        .where(eq(attempts.testId, testId))
        .orderBy(
            desc(results.score),
            asc(attempts.submittedAt)
        );

    return rows;
}


export {
    getLeaderboard,
}