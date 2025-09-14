import { Google } from "arctic";
import { CALLBACK_URL, CLIENT_ID, CLIENT_SECRET } from "../lib/constant";


export const google = new Google(
    CLIENT_ID!,
    CLIENT_SECRET,
    CALLBACK_URL
);