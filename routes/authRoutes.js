import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  register,
  login,
  logout,
  getCurrentUser
} from "../controllers/authController.js";

const router = express.Router();

// Routes publiques
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Routes protégées
router.get("/me", authenticateToken, getCurrentUser);

export default router; 