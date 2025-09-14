
export const graphqlSchema = `#graphql
    type Query{
        hello: String!
        me:User!
        googleLogin: String!
        generateAccessToken: String!

        tests: [Test!]!
        test(id:ID!): Test 

        getResult(attemptId: ID!): Result

        allUsers: [User!]!
        getLeaderboard(testId: ID!): [Result!]!
    }

    type Mutation{
        register(name:String, email:String, password:String, role:String):User
        login(email:String, password:String):AuthPayload

        startTest(testId: ID!): Attempt
        saveAnswer(attemptId: ID!, questionId: ID!, selectedOption: String, markedForReview: Boolean): Boolean
        submitTest(attemptId: ID!): Result

        createTest(data: TestInput!): Test
        updateTest(id: ID!, data: UpdateTestInput!): Test
        deleteTest(id: ID!): Boolean

        addSection(testId: ID!, data: SectionInput!): Section
        deleteSection(ids: [ID!]): Boolean

        addQuestion(sectionId: ID!, data: QuestionInput!): Question
        deleteQuestion(ids: [ID!]): Boolean

        evaluateTest(testId: Int!): [Result!]!
        # sendResultEmail(attemptId: Int!): Boolean
    }


    # ===============================
    # Response Types
    # ===============================
    type User {
      id: ID!
      name: String!
      email: String!
      role: String!
      createdAt: String!
    }

    type AuthPayload {
      accessToken: String!
      refreshToken: String!
      user: User!
    }

    type Test {
      id: ID!
      title: String!
      description: String
      duration: Int!
      sections: [Section!]!
      createdAt: String!
    }

    type Section {
      id: ID!
      name: String!
      duration: Int
      questions: [Question!]!
    }

    type Question {
      id: ID!
      text: String!
      options: [String!]!
      correctAnswer: Int
    }

    type Attempt {
      id: ID!
      testId: Int!
      userId: Int!
      startedAt: String!
      submittedAt: String
      isSubmitted: Boolean!
      answers: [Answer!]!
    }

    type Answer {
      id: ID!
      questionId: Int!
      selectedOption: Int
      markedForReview: Boolean!
    }

    type Result {
      attemptId: Int!
      score: Int!
      total: Int!
      correct: Int!
      wrong: Int!
      notAnswered: Int!
      sectionWise: [SectionResult!]!
      createdAt: String!
    }

    type SectionResult {
      sectionId: Int!
      correct: Int!
      wrong: Int!
      notAnswered: Int!
      score: Int!
    }
    # ===============================
    # Input Types
    # ===============================
    input QuestionInput {
      text: String!
      options: [String!]!
      correctAnswer: Int
    }

    input SectionInput {
      name: String!
      duration: Int
      questions: [QuestionInput!]!
    }

    input TestInput {
      title: String!
      description: String!
      duration: Int!
      sections: [SectionInput!]!
    }

    input UpdateQuestionInput {
      id: ID!
      text: String
      options: [String]
      correctAnswer: Int
    }
    input UpdateSectionInput {
      id: ID!
      name: String
      duration: Int
      questions: [UpdateQuestionInput]
    }

    input UpdateTestInput {
      id: ID!
      title: String
      description: String
      duration: Int
      sections: [UpdateSectionInput]
      }
`