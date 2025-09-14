import { config } from "dotenv";
config();

const JWT_SECRET = process.env.JWT_SECRET!;
const PORT = process.env.PORT!;
const DATABASE_URL = process.env.DATABASE_URL!;
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const CALLBACK_URL = process.env.CALLBACK_URL!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

export {
    JWT_SECRET,
    PORT,
    DATABASE_URL,
    CLIENT_ID,
    CLIENT_SECRET,
    CALLBACK_URL,
    REFRESH_SECRET
};