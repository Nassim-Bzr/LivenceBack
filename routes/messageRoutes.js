import express from "express";
import { 
  getConversations, 
  getMessages, 
  sendMessage, 
  startConversation,
  startConversationWithAdmin,
  markMessagesAsRead,
  getAdminConversations,
  deleteAllMessages,
  deleteConversationMessages,
  deleteUserMessages,
  deleteOldMessages,
  deleteAllConversations
} from "../controllers/messageController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent un token d'authentification
router.use(authenticateToken);

// Récupérer toutes les conversations de l'utilisateur
router.get("/conversations", getConversations);

router.get("/admin/conversations", authenticateToken, getAdminConversations);
// Récupérer tous les messages d'une conversation
router.get("/conversations/:conversationId/messages", getMessages);

// Envoyer un message dans une conversation
router.post("/conversations/:conversationId/messages", sendMessage);

// Créer une nouvelle conversation
router.post("/conversations", startConversation);

// Créer une conversation avec l'admin
router.post("/conversations/admin", startConversationWithAdmin);

// Marquer des messages comme lus
router.put("/conversations/:conversationId/read", markMessagesAsRead);
router.delete("/conversations", deleteAllConversations);
// Routes pour la suppression des messages
router.delete("/messages", deleteAllMessages);
router.delete("/conversations/:conversationId/messages", deleteConversationMessages);
router.delete("/users/:userId/messages", deleteUserMessages);
router.delete("/messages/before-date", deleteOldMessages);

export default router; 