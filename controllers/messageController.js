import { Message, User } from "../models/index.js";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

// Fonction pour envoyer un message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, contenu, appartementId, type } = req.body;
    
    console.log("Requête d'envoi de message:", {
      receiverId,
      contenu: contenu ? contenu.substring(0, 20) + "..." : null,
      appartementId,
      type
    });
    
    // Récupérer le token (depuis "token" cookie ou autorisation Bearer)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.error("Erreur d'authentification: Aucun token fourni");
      return res.status(401).json({ message: "Non autorisé - Veuillez vous connecter" });
    }
    
    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token décodé:", decoded);
    } catch (error) {
      console.error("Erreur de vérification du token:", error);
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }
    
    const senderId = decoded.id;
    
    // Vérifier si le destinataire existe
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      console.error("Destinataire non trouvé:", receiverId);
      return res.status(404).json({ message: "Destinataire non trouvé" });
    }
    
    // Créer le message
    const message = await Message.create({
      senderId,
      receiverId,
      contenu,
      appartementId: appartementId || null,
      type: type || "general"
    });
    
    console.log("Message créé avec succès:", message.id);
    
    // Émettre un événement socket.io pour notification en temps réel
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', {
        id: message.id,
        senderId,
        receiverId,
        contenu,
        appartementId: appartementId || null,
        type: type || "general",
        createdAt: message.createdAt,
        lu: false
      });
      console.log("Notification socket envoyée à l'utilisateur", receiverId);
    } else {
      console.warn("Impossible d'envoyer la notification socket: io non disponible");
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
};

// Récupérer les conversations d'un utilisateur
export const getUserConversations = async (req, res) => {
  try {
    console.log("Récupération des conversations de l'utilisateur");
    
    // Récupérer le token (depuis "token" cookie ou autorisation Bearer)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.error("Erreur d'authentification: Aucun token fourni");
      return res.status(401).json({ message: "Non autorisé - Veuillez vous connecter" });
    }
    
    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token décodé:", decoded);
    } catch (error) {
      console.error("Erreur de vérification du token:", error);
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }
    
    const userId = decoded.id;
    const userRole = decoded.role;
    
    console.log(`Recherche des conversations pour l'utilisateur ${userId} (${userRole})`);
    
    // Trouver tous les messages impliquant l'utilisateur
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'nom', 'email', 'role'] },
        { model: User, as: 'receiver', attributes: ['id', 'nom', 'email', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`${messages.length} messages trouvés au total`);
    
    // Créer un Map pour stocker les conversations uniques
    const conversationsMap = new Map();
    
    // Parcourir tous les messages pour extraire les conversations uniques
    messages.forEach(message => {
      // Déterminer l'ID de l'autre utilisateur dans la conversation
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      // Récupérer les infos de l'autre utilisateur
      const otherUser = message.senderId === userId ? message.receiver : message.sender;
      
      // Si on n'a pas encore cette conversation
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          id: otherUserId,
          nom: otherUser?.nom || 'Utilisateur inconnu',
          email: otherUser?.email || '',
          role: otherUser?.role || 'user',
          lastMessage: message.contenu,
          lastMessageDate: message.createdAt
        });
      } else {
        // Si on a déjà cette conversation, mettre à jour le dernier message si celui-ci est plus récent
        const existingConv = conversationsMap.get(otherUserId);
        if (new Date(message.createdAt) > new Date(existingConv.lastMessageDate)) {
          existingConv.lastMessage = message.contenu;
          existingConv.lastMessageDate = message.createdAt;
          conversationsMap.set(otherUserId, existingConv);
        }
      }
    });
    
    // Convertir le Map en tableau
    const conversations = Array.from(conversationsMap.values());
    
    // Compter les messages non lus pour chaque conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.count({
          where: {
            senderId: conv.id,
            receiverId: userId,
            lu: false
          }
        });
        
        return {
          ...conv,
          unreadCount
        };
      })
    );
    
    // Trier les conversations par date du dernier message (plus récent en premier)
    conversationsWithUnread.sort((a, b) => 
      new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
    );
    
    console.log(`${conversationsWithUnread.length} conversations uniques trouvées`);
    
    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    console.error("Erreur lors de la récupération des conversations:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des conversations" });
  }
};

// Récupérer les messages entre deux utilisateurs
export const getMessagesBetweenUsers = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    console.log(`Récupération des messages avec l'utilisateur ${otherUserId}`);
    
    // Récupérer le token (depuis "token" cookie ou autorisation Bearer)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.error("Erreur d'authentification: Aucun token fourni");
      return res.status(401).json({ message: "Non autorisé - Veuillez vous connecter" });
    }
    
    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token décodé:", decoded);
    } catch (error) {
      console.error("Erreur de vérification du token:", error);
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }
    
    const userId = decoded.id;
    
    // Récupérer tous les messages entre les deux utilisateurs
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'nom', 'email', 'role'] },
        { model: User, as: 'receiver', attributes: ['id', 'nom', 'email', 'role'] }
      ]
    });
    
    console.log(`${messages.length} messages trouvés entre ${userId} et ${otherUserId}`);
    
    // Marquer les messages reçus non lus comme lus
    const unreadCount = await Message.update(
      { lu: true },
      {
        where: {
          receiverId: userId,
          senderId: otherUserId,
          lu: false
        }
      }
    );
    
    console.log(`${unreadCount[0]} messages marqués comme lus`);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des messages" });
  }
};

// Récupérer le nombre de messages non lus
export const getUnreadMessagesCount = async (req, res) => {
  try {
    console.log("Récupération du nombre de messages non lus");
    
    // Récupérer le token (depuis "token" cookie ou autorisation Bearer)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.error("Erreur d'authentification: Aucun token fourni");
      return res.status(401).json({ message: "Non autorisé - Veuillez vous connecter" });
    }
    
    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token décodé:", decoded);
    } catch (error) {
      console.error("Erreur de vérification du token:", error);
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }
    
    const userId = decoded.id;
    
    // Compter le nombre de messages non lus
    const count = await Message.count({
      where: {
        receiverId: userId,
        lu: false
      }
    });
    
    console.log(`${count} messages non lus`);
    
    res.status(200).json({ count });
  } catch (error) {
    console.error("Erreur lors du comptage des messages non lus:", error);
    res.status(500).json({ message: "Erreur lors du comptage des messages non lus" });
  }
};

// Marquer plusieurs messages comme lus
export const markMessagesAsRead = async (req, res) => {
  try {
    console.log("Requête de marquage de messages comme lus");
    
    // Récupérer le token
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.error("Erreur d'authentification: Aucun token fourni");
      return res.status(401).json({ message: "Non autorisé - Veuillez vous connecter" });
    }
    
    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token décodé:", decoded);
    } catch (error) {
      console.error("Erreur de vérification du token:", error);
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }
    
    const userId = decoded.id;
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: "Liste d'IDs de messages invalide" });
    }
    
    console.log(`Marquage de ${messageIds.length} messages comme lus pour l'utilisateur ${userId}`);
    
    // Vérifier que les messages existent et que l'utilisateur est bien le destinataire
    const messages = await Message.findAll({
      where: {
        id: messageIds,
        receiverId: userId,
        lu: false // Uniquement récupérer les messages non lus pour optimiser
      }
    });
    
    if (messages.length === 0) {
      console.warn("Aucun message non lu correspondant trouvé");
      return res.status(200).json({ 
        message: "Aucun message non lu correspondant trouvé", 
        count: 0 
      });
    }
    
    // Marquer les messages comme lus
    await Message.update(
      { lu: true },
      {
        where: {
          id: messageIds,
          receiverId: userId,
          lu: false
        }
      }
    );
    
    console.log(`${messages.length} messages marqués comme lus`);
    
    // Émettre un événement socket.io pour notifier les expéditeurs que leurs messages ont été lus
    const io = req.app.get('io');
    if (io) {
      // Grouper les messages par expéditeur
      const senderGroups = new Map();
      
      for (const message of messages) {
        if (!senderGroups.has(message.senderId)) {
          senderGroups.set(message.senderId, []);
        }
        senderGroups.get(message.senderId).push(message.id);
      }
      
      // Envoyer la notification à chaque expéditeur
      for (const [senderId, messageIds] of senderGroups.entries()) {
        console.log(`Notification à l'utilisateur ${senderId} : ${messageIds.length} messages lus`);
        io.to(`user_${senderId}`).emit("messages_read", {
          receiverId: userId,
          messageIds: messageIds
        });
      }
    }
    
    res.status(200).json({ 
      message: "Messages marqués comme lus avec succès",
      count: messages.length,
      messageIds: messages.map(m => m.id)
    });
  } catch (error) {
    console.error("Erreur lors du marquage des messages comme lus:", error);
    res.status(500).json({ message: "Erreur lors du marquage des messages comme lus" });
  }
}; 