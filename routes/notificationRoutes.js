import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from "../controllers/notificationController.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Récupérer les notifications d'un utilisateur
router.get("/", getUserNotifications);

// Marquer une notification comme lue
router.put("/:notificationId/read", markNotificationAsRead);

// Marquer toutes les notifications comme lues
router.put("/read-all", markAllNotificationsAsRead);

// Supprimer une notification
router.delete("/:notificationId", deleteNotification);

export default router; 