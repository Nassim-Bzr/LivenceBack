import { Message, User } from "../models/index.js";
import jwt from "jsonwebtoken";

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
    
    // Trouver tous les utilisateurs avec qui l'utilisateur courant a échangé des messages
    const sentMessages = await Message.findAll({
      where: { senderId: userId },
      attributes: ['receiverId'],
      group: ['receiverId']
    });
    
    const receivedMessages = await Message.findAll({
      where: { receiverId: userId },
      attributes: ['senderId'],
      group: ['senderId']
    });
    
    // Extraire les IDs uniques
    const contactIds = new Set([
      ...sentMessages.map(msg => msg.receiverId),
      ...receivedMessages.map(msg => msg.senderId)
    ]);
    
    console.log(`Contacts trouvés: ${contactIds.size}`);
    
    // Récupérer les informations des contacts
    const contacts = await User.findAll({
      where: { id: [...contactIds] },
      attributes: ['id', 'nom', 'email', 'role']
    });
    
    console.log(`Données de contacts récupérées: ${contacts.length}`);
    
    res.status(200).json(contacts);
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
        [Symbol.for('sequelize.or')]: [
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
    
    console.log(`${messages.length} messages trouvés`);
    
    // Marquer les messages non lus comme lus
    await Message.update(
      { lu: true },
      {
        where: {
          receiverId: userId,
          senderId: otherUserId,
          lu: false
        }
      }
    );
    
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