import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { smoobuWebhook, checkSmoobuAvailability, handleReservationNotification } from "../controllers/smoobuController.js";

const router = express.Router();

// Route pour recevoir les événements webhook de Smoobu
// Cette route ne nécessite pas d'authentification par JWT car elle sera appelée par Smoobu
router.post("/webhook", smoobuWebhook);

// Route pour gérer les notifications de réservation depuis le frontend (nécessite authentification)
router.post("/reservation-notification", authenticateToken, handleReservationNotification);

// Route pour vérifier la disponibilité d'un appartement (nécessite authentification)
router.post("/check-availability", authenticateToken, checkSmoobuAvailability);

export default router; 