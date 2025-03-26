import express from 'express';
import { 
  sendMessage, 
  getUserConversations, 
  getMessagesBetweenUsers, 
  getUnreadMessagesCount 
} from '../controllers/messageController.js';

const router = express.Router();

// Route pour envoyer un message
router.post('/envoyer', sendMessage);

// Route pour récupérer toutes les conversations d'un utilisateur
router.get('/conversations', getUserConversations);

// Route pour récupérer les messages entre deux utilisateurs
router.get('/utilisateur/:otherUserId', getMessagesBetweenUsers);

// Route pour récupérer le nombre de messages non lus
router.get('/non-lus/count', getUnreadMessagesCount);

export default router; 