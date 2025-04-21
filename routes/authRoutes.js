import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import {
  register,
  login,
  logout,
  getCurrentUser,
  googleAuth
} from "../controllers/authController.js";

const router = express.Router();

// Routes publiques
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/google", googleAuth);
router.post("/firebase/login", googleAuth);

// Routes protégées
router.get("/me", authenticateToken, getCurrentUser);

export default router; 