import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../lib/constant";
import { Response, Request } from "express";

export interface MyContext {
  req: Request;
  res: Response;
  user?: { id: string; name: string; email: string; role: string };
}

export const buildContext = async ({ req, res, }: { req: Request, res: Response }): Promise<MyContext> => {
  let user: MyContext["user"] | undefined = undefined;

  const accessToken = req.cookies?.access_token;
  if (accessToken) {
    user = jwt.verify(accessToken, JWT_SECRET) as MyContext["user"];
  }

  return { req, res, user };
};

export const isAuthenticated = ({ user }: MyContext) => {
  if (!user) throw new Error("User not Authenticated");
  return;
};

export const isAdmin = ({ user }: MyContext) => {
  if (user?.role !== "ADMIN") throw new Error("User has not Admin Access");
};
