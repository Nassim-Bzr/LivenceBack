import express from "express";
import { register, login, getUsers, getUserById, updateUser, deleteUser, logout, getMe } from "../controllers/userController.js";
        import { authenticateToken } from "../middlewares/authMiddleware.js"; // Middleware d'authentification

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/logout", logout);
router.get("/me", authenticateToken, getMe); // 🔥 Route protégée pour récupérer l'utilisateur connecté
export default router;
