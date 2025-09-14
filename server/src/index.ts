import express, { urlencoded } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { expressMiddleware } from '@as-integrations/express5';
import connectGraphql from "./graphql/graphql";
import { buildContext } from "./middlewares/auth";
import { PORT } from "./lib/constant";
import { googleCallback } from "./controller/auth";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }))
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

const graphqlConnection = connectGraphql();

(
    async function start() {
        await graphqlConnection.start();
        app.use("/graphql", expressMiddleware(graphqlConnection, { context: buildContext }));
        app.get("/", (req, res) => res.send("ok."))
        app.get("/auth/google/callback", googleCallback);
        app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: "API not Exist..."
            })
        })
        app.listen(PORT || 3000, () => console.info("express server is running..."))
    }
)();