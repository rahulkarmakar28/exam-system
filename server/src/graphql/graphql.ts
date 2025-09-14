import { ApolloServer } from "@apollo/server";
import { graphqlSchema } from "./schema/schema";
import { graphqlResolver } from "./resolver/resolver";





export default function connectGraphql<MyContext>() {
    return new ApolloServer({
        typeDefs: graphqlSchema,
        resolvers: graphqlResolver, 
        introspection: true,
    });
}

