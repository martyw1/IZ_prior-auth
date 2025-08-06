import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { auditService } from "../services/audit";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log("AUTH: Starting authentication...");
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      console.log("AUTH: No token provided");
      return res.status(401).json({ message: "No token provided" });
    }

    console.log("AUTH: Token found, verifying...");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log("AUTH: Token decoded, getting user...");
    const user = await storage.getUser(decoded.id);

    if (!user || !user.isActive) {
      console.log("AUTH: User not found or inactive");
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log("AUTH: User found, setting req.user...");
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    console.log("AUTH: Authentication successful, calling next()");
    next();
  } catch (error) {
    console.log("AUTH: Authentication error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("AUTHORIZE: Starting authorization check...");
    if (!req.user) {
      console.log("AUTHORIZE: No user found");
      return res.status(401).json({ message: "Not authenticated" });
    }

    console.log("AUTHORIZE: User found, checking role...");
    if (!roles.includes(req.user.role)) {
      console.log("AUTHORIZE: Insufficient permissions");
      // Temporarily disable audit logging to isolate the issue
      // auditService.log(req.user.id, "UNAUTHORIZED_ACCESS", "authorization", null, {
      //   requiredRoles: roles,
      //   userRole: req.user.role,
      //   path: req.path,
      // }, req.ip, req.get("User-Agent") || "");
      
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    console.log("AUTHORIZE: Authorization successful");
    next();
  };
};

export const generateToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
