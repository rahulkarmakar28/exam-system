import { db } from "../../config/db";
import { generateAccessToken, getAllUsers, getGoogleLoginUrl, login, register, userInfo } from "../../controller/auth";
import { getLeaderboard } from "../../controller/leaderBoard";
import { evaluateTest, getResult } from "../../controller/result";
import {
    createTest,
    deleteQuestion,
    deleteSection,
    deleteTest,
    getAllTests,
    getTestById,
    saveOrUpdateAnswer,
    startTest,
    submitTest,
    updateTest
} from "../../controller/test";
import { questions, sections } from "../../db/schema";
import { eq } from "drizzle-orm";

export const graphqlResolver = {
    Mutation: {
        register: register,
        login: login,

        startTest: startTest,
        saveAnswer: saveOrUpdateAnswer,
        submitTest: submitTest,

        createTest: createTest,
        updateTest: updateTest,
        deleteTest: deleteTest,
        deleteSection: deleteSection,
        deleteQuestion: deleteQuestion,

        evaluateTest: evaluateTest,
    },
    Query: {
        hello: () => "hello",
        me: userInfo,
        googleLogin: getGoogleLoginUrl,
        generateAccessToken: generateAccessToken,
        allUsers: getAllUsers,

        tests: getAllTests,
        test: getTestById,

        getResult: getResult,
        getLeaderboard: getLeaderboard,
    },
    Test: {
        sections: async (parent: any) => {
            return await db.select().from(sections).where(eq(sections.testId, parent.id));
        },
    },

    Section: {
        questions: async (parent: any) => {
            return await db.select().from(questions).where(eq(questions.sectionId, parent.id));
        },
    },

}