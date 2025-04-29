import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { createReservation, getUserReservations, updateReservationStatus, getReservationById, getAllReservations, checkSmoobuReservation, updateReservation } from "../controllers/reservationController.js";

const router = express.Router();

router.post("/", authenticateToken, createReservation); // 🔥 L'user doit être connecté pour réserver
router.get("/all", authenticateToken, getAllReservations);

router.get("/user", authenticateToken, getUserReservations); // 🔥 Voir ses réservations
router.put("/:id/status", authenticateToken, updateReservationStatus);
router.get("/:id", authenticateToken, getReservationById);
router.put("/:id", authenticateToken, updateReservation);

// Route pour vérifier si une réservation Smoobu existe déjà
router.get("/check-smoobu/:smoobuId", authenticateToken, checkSmoobuReservation);

export default router;
