import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Set up session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "consulttrackGy79shd0f2hqiuGvbNJK",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          // Don't include password in the user object that's stored in the session
          const { password: _, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword as User);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Serialize user to store in session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      // Don't include password in the user object that's stored in the session
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword as User);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't include password in the response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).send("Invalid username or password");
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    res.json(req.user);
  });
  
  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success even if user not found for security
      if (!user) {
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
      
      // Generate a secure random token
      const resetToken = randomBytes(32).toString('hex');
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
      
      // Import email service
      const { emailService } = await import('./services/email-service');
      
      // Send password reset email
      await emailService.sendPasswordResetEmail({
        to: user.email || "",
        resetToken: resetToken,
        userName: user.name || user.username,
      });
      
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route - Verify token
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Password reset link is invalid or has expired." 
        });
      }
      
      // Return success
      res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route - Process password change
  app.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Please provide a password with at least 8 characters." });
      }
      
      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Password reset link is invalid or has expired." 
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);
      
      res.status(200).json({ message: "Password has been reset successfully." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
}