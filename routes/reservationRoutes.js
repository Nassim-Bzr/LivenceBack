import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { createReservation, getUserReservations } from "../controllers/reservationController.js";

const router = express.Router();

router.post("/", authenticateToken, createReservation); // 🔥 L'user doit être connecté pour réserver
router.get("/user", authenticateToken, getUserReservations); // 🔥 Voir ses réservations

export default router;
