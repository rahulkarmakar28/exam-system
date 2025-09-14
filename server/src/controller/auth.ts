import { Request, Response } from "express"
import { db } from "../config/db";
import { users } from "../db/schema";
import { isAdmin, MyContext } from "../middlewares/auth";
import { eq } from 'drizzle-orm';
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET, REFRESH_SECRET } from "../lib/constant";
import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { google } from "../config/google";
import { isAuthenticated } from "../middlewares/auth";


interface loginPayload {
    email: string,
    password: string
}
interface registerPayload extends loginPayload {
    name: string,
    role: string
}


async function userInfo(parent: any, args: any, context: MyContext) {
    isAuthenticated(context)
    return context.user;
}
async function getAllUsers(parent: any, args: any, context: MyContext) {
    isAdmin(context);
    return await db.select().from(users).where(eq(users.role, "USER"));
}

function generateTokens(user: any) {
    const accessToken = jwt.sign({
        id: user.id, role: user.role, name: user.name, email: user.email
    }, JWT_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign({
        id: user.id, role: user.role, name: user.name, email: user.email
    }, REFRESH_SECRET, { expiresIn: "1d" });

    return { accessToken, refreshToken };
}
async function register(_: unknown, args: registerPayload, context: MyContext) {

    const [isExist] = await db.select().from(users).where(eq(users.email, args.email));
    if (isExist) throw Error("User already Exist");

    const hashed = await bcrypt.hash(args.password, 10);
    const [user] = await db.insert(users).values({ name: args.name, email: args.email, password: hashed, role: args.role }).returning();
    return user;

}
async function login(_: unknown, args: loginPayload, context: MyContext) {
    if (context.user) throw Error("User already LoggedIn");

    const [user] = await db.select().from(users).where(eq(users.email, args.email));
    if (!user) throw new Error("Invalid credentials");

    const ok = await bcrypt.compare(args.password, user.password);
    if (!ok) throw new Error("Invalid credentials");

    const cookieOptions = {
        expires: new Date(Date.now() + 30 * 60 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: "none" as const,
    };

    const { accessToken, refreshToken } = generateTokens(user);
    context.res.cookie("accessToken", accessToken, cookieOptions);
    context.res.cookie("refreshToken", refreshToken, cookieOptions);
    return { accessToken, refreshToken, user };

}
async function generateAccessToken(_: unknown, __: any, context: MyContext) {
    const token = context.req.cookies.refreshToken;
    if (!token) throw new Error("No refresh token");

    const payload = jwt.verify(token, REFRESH_SECRET) as MyContext["user"];

    const newAccessToken = jwt.sign(
        { id: (payload as JwtPayload).id },
        JWT_SECRET,
        { expiresIn: "30m" }
    );

    const cookieOptions = {
        expires: new Date(Date.now() + 30 * 60 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: "none" as const,
    };

    context.res.cookie("accessToken", newAccessToken, cookieOptions);
    return newAccessToken;
}

async function getGoogleLoginUrl(_: unknown, angs: any, { req, res }: MyContext) {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const scopes = ["openid", "profile", "email"];
    const url = google.createAuthorizationURL(state, codeVerifier, scopes);

    const cookieOption = {
        httpOnly: true,
        secure: false,
        maxAge: 10 * 60 * 1000,
        sameSite: 'lax' as const
    }
    res.cookie("google_oauth_state", state, cookieOption);
    res.cookie("google_code_verifier", codeVerifier, cookieOption);
    return url.toString();

}
async function googleCallback(req: Request, res: Response) {
    const { code, state } = req.query;

    const {
        google_oauth_state: storedState,
        google_code_verifier: codeVerifier,
    } = req.cookies;

    if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
        return res.redirect("http://localhost:5173?error=invalid_state");
    }
    const tokens = await google.validateAuthorizationCode(
        typeof code === "string"
            ? code
            : Array.isArray(code)
                ? String(code[0])
                : typeof code === "object" && code !== null
                    ? String((code as any).toString ? (code as any).toString() : "")
                    : "",
        codeVerifier
    )

    // console.log(tokens)
    const claims = decodeIdToken(tokens.idToken()) as { sub?: string; name?: string; email?: string };
    const { sub: googleUserId, name, email } = claims;
    const [user] = await db.select().from(users).where(eq(users.email, email as string))
    if (user) {
        const cookieOptions = {
            expires: new Date(Date.now() + 10 * 60 * 1000),
            httpOnly: true,
            secure: true,
            sameSite: "none" as const,
        };
        const accessToken = jwt.sign({
            id: user.id, role: user.role, name: user.name, email: user.email
        }, JWT_SECRET, { expiresIn: "30m" });
        const refreshToken = jwt.sign({
            id: user.id, role: user.role, name: user.name, email: user.email
        }, JWT_SECRET, { expiresIn: "1d" });
        res.cookie("accessToken", accessToken, cookieOptions);
        res.cookie("refreshToken", refreshToken, cookieOptions);

        return res.redirect(`http://localhost:5173/authredirect?success=true&accessToken=${accessToken}&refreshToken=${refreshToken}`);
    }
    res.redirect("http://localhost:5173/authredirect?success=false");


}

export {
    userInfo,
    getAllUsers,
    register,
    login,
    getGoogleLoginUrl,
    googleCallback,
    generateAccessToken,
}