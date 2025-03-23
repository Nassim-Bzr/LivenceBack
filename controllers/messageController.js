import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { Op } from "sequelize";
import sequelize from "../config/database.js";

// Récupérer toutes les conversations de l'utilisateur connecté
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les conversations avec les participants et le dernier message
    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id", "nom", "email"],
          through: { attributes: [] }
        }
      ],
      order: [["lastMessageAt", "DESC"]]
    });

    // Filtrer pour n'inclure que les conversations où l'utilisateur est participant
    const userConversations = conversations.filter(conversation => 
      conversation.participants.some(participant => participant.id === userId)
    );

    // Pour chaque conversation, vérifier s'il y a des messages non lus
    const conversationsWithUnreadCount = await Promise.all(
      userConversations.map(async (conversation) => {
        const unreadCount = await Message.count({
          where: {
            conversationId: conversation.id,
            senderId: { [Op.ne]: userId },
            isRead: false
          }
        });

        // Ajouter la propriété isAdmin aux participants
        const participantsWithRole = conversation.participants.map(participant => ({
          ...participant.toJSON(),
          isAdmin: participant.role === "admin"
        }));

        return {
          ...conversation.toJSON(),
          participants: participantsWithRole,
          unreadCount
        };
      })
    );

    res.status(200).json(conversationsWithUnreadCount);
  } catch (error) {
    console.error("Erreur lors de la récupération des conversations:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des conversations", error });
  }
};

export const getAdminConversations = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Récupérer toutes les conversations avec leurs participants et derniers messages
    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id", "nom", "email", "role"],
          through: { attributes: [] }
        }
      ],
      order: [["lastMessageAt", "DESC"]]
    });

    // Ajouter le compteur de messages non lus pour chaque conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        // Compter les messages non lus pour l'admin
        const unreadCount = await Message.count({
          where: {
            conversationId: conversation.id,
            senderId: { [Op.ne]: req.user.id },
            isRead: false
          }
        });

        // Ajouter la propriété isAdmin aux participants
        const participantsWithRole = conversation.participants.map(participant => ({
          ...participant.toJSON(),
          isAdmin: participant.role === "admin"
        }));

        return {
          ...conversation.toJSON(),
          participants: participantsWithRole,
          unreadCount
        };
      })
    );

    res.status(200).json(conversationsWithDetails);
  } catch (error) {
    console.error("Erreur lors de la récupération des conversations admin:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const deleteAllConversations = async (req, res) => {
  try {
    // Supprimer toutes les conversations
    // Cela supprimera automatiquement tous les messages associés grâce à la relation en cascade
    await Conversation.destroy({ where: {} });
    
    res.status(200).json({ message: "Toutes les conversations ont été supprimées avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression des conversations:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
// Récupérer tous les messages d'une conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur est un participant de la conversation
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id"],
          through: { attributes: [] }
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" });
    }

    // Vérifier si l'utilisateur est un participant
    const isParticipant = conversation.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Accès non autorisé à cette conversation" });
    }

    // Récupérer les messages
    const messages = await Message.findAll({
      where: { conversationId },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "nom"]
        }
      ],
      order: [["createdAt", "ASC"]]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des messages", error });
  }
};

// Envoyer un message dans une conversation
export const sendMessage = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Le contenu du message ne peut pas être vide" });
    }

    // Vérifier si l'utilisateur est un participant de la conversation
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id"],
          through: { attributes: [] }
        }
      ],
      transaction
    });

    if (!conversation) {
      await transaction.rollback();
      return res.status(404).json({ message: "Conversation non trouvée" });
    }

    // Vérifier si l'utilisateur est un participant
    const isParticipant = conversation.participants.some(p => p.id === userId);
    if (!isParticipant) {
      await transaction.rollback();
      return res.status(403).json({ message: "Accès non autorisé à cette conversation" });
    }

    // Créer le message
    const message = await Message.create(
      {
        content,
        senderId: userId,
        conversationId
      },
      { transaction }
    );

    // Mettre à jour la dernière activité de la conversation
    await conversation.update(
      {
        lastMessageAt: new Date(),
        lastMessageContent: content
      },
      { transaction }
    );

    await transaction.commit();

    // Inclure les informations de l'expéditeur dans la réponse
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "nom"]
        }
      ]
    });

    res.status(201).json(messageWithSender);
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur lors de l'envoi du message:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi du message", error });
  }
};

// Démarrer une nouvelle conversation
export const startConversation = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { participantIds, initialMessage } = req.body;
    const userId = req.user.id;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: "Vous devez spécifier au moins un participant" });
    }

    if (!initialMessage || initialMessage.trim() === "") {
      return res.status(400).json({ message: "Le message initial ne peut pas être vide" });
    }

    // Vérifier si tous les participants existent
    const participants = await User.findAll({
      where: { id: [...participantIds, userId] },
      transaction
    });

    if (participants.length !== participantIds.length + 1) {
      await transaction.rollback();
      return res.status(404).json({ message: "Un ou plusieurs participants n'existent pas" });
    }

    // Créer la conversation
    const conversation = await Conversation.create(
      {
        lastMessageAt: new Date(),
        lastMessageContent: initialMessage
      },
      { transaction }
    );

    // Ajouter les participants
    await conversation.addParticipants(participants, { transaction });

    // Créer le message initial
    const message = await Message.create(
      {
        content: initialMessage,
        senderId: userId,
        conversationId: conversation.id
      },
      { transaction }
    );

    await transaction.commit();

    // Récupérer la conversation complète avec les participants
    const newConversation = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id", "nom", "email", "role"],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      conversation: {
        ...newConversation.toJSON(),
        participants: newConversation.participants.map(p => ({
          ...p.toJSON(),
          isAdmin: p.role === "admin"
        }))
      },
      message: {
        ...message.toJSON(),
        sender: participants.find(p => p.id === userId)
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur lors de la création de la conversation:", error);
    res.status(500).json({ message: "Erreur lors de la création de la conversation", error });
  }
};

// Démarrer une conversation avec l'admin
export const startConversationWithAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { initialMessage = "Bonjour, j'ai besoin d'assistance." } = req.body;
    const userId = req.user.id;

    // Rechercher l'admin
    const admin = await User.findOne({
      where: { role: "admin" },
      transaction
    });

    if (!admin) {
      await transaction.rollback();
      return res.status(404).json({ message: "Aucun administrateur n'a été trouvé" });
    }

    // Vérifier si une conversation existe déjà entre cet utilisateur et l'admin
    const existingConversation = await Conversation.findOne({
      include: [
        {
          model: User,
          as: "participants",
          where: { id: admin.id },
          through: { attributes: [] }
        }
      ],
      transaction
    });

    if (existingConversation) {
      // Une conversation existe déjà, pas besoin d'en créer une nouvelle
      const message = await Message.create(
        {
          content: initialMessage,
          senderId: userId,
          conversationId: existingConversation.id
        },
        { transaction }
      );

      await existingConversation.update(
        {
          lastMessageAt: new Date(),
          lastMessageContent: initialMessage
        },
        { transaction }
      );

      await transaction.commit();

      // Récupérer la conversation complète
      const updatedConversation = await Conversation.findByPk(existingConversation.id, {
        include: [
          {
            model: User,
            as: "participants",
            attributes: ["id", "nom", "email", "role"],
            through: { attributes: [] }
          }
        ]
      });

      const currentUser = await User.findByPk(userId, {
        attributes: ["id", "nom"]
      });

      return res.status(200).json({
        conversation: {
          ...updatedConversation.toJSON(),
          participants: updatedConversation.participants.map(p => ({
            ...p.toJSON(),
            isAdmin: p.role === "admin"
          }))
        },
        message: {
          ...message.toJSON(),
          sender: currentUser
        }
      });
    }

    // Créer une nouvelle conversation avec l'admin
    const conversation = await Conversation.create(
      {
        lastMessageAt: new Date(),
        lastMessageContent: initialMessage
      },
      { transaction }
    );

    // Ajouter l'utilisateur et l'admin comme participants
    await conversation.addParticipants([userId, admin.id], { transaction });

    // Créer le message initial
    const message = await Message.create(
      {
        content: initialMessage,
        senderId: userId,
        conversationId: conversation.id
      },
      { transaction }
    );

    await transaction.commit();

    // Récupérer la conversation complète avec les participants
    const newConversation = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id", "nom", "email", "role"],
          through: { attributes: [] }
        }
      ]
    });

    const currentUser = await User.findByPk(userId, {
      attributes: ["id", "nom"]
    });

    res.status(201).json({
      conversation: {
        ...newConversation.toJSON(),
        participants: newConversation.participants.map(p => ({
          ...p.toJSON(),
          isAdmin: p.role === "admin"
        }))
      },
      message: {
        ...message.toJSON(),
        sender: currentUser
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur lors de la création de la conversation avec l'admin:", error);
    res.status(500).json({ message: "Erreur lors de la création de la conversation avec l'admin", error });
  }
};

// Marquer les messages d'une conversation comme lus
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Mettre à jour tous les messages non lus qui ne sont pas envoyés par l'utilisateur
    const updated = await Message.update(
      { isRead: true },
      {
        where: {
          conversationId,
          senderId: { [Op.ne]: userId },
          isRead: false
        }
      }
    );

    res.status(200).json({ 
      message: "Messages marqués comme lus", 
      updatedCount: updated[0] 
    });
  } catch (error) {
    console.error("Erreur lors du marquage des messages comme lus:", error);
    res.status(500).json({ message: "Erreur lors du marquage des messages comme lus", error });
  }
};

// Supprimer tous les messages
export const deleteAllMessages = async (req, res) => {
  try {
    // Supprimer tous les messages
    await Message.destroy({ where: {} });
    
    res.status(200).json({ message: "Tous les messages ont été supprimés avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression des messages:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Supprimer tous les messages d'une conversation spécifique
export const deleteConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Vérifier si la conversation existe
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" });
    }
    
    // Supprimer tous les messages de la conversation
    await Message.destroy({ where: { conversationId } });
    
    // Mettre à jour les informations de dernière activité
    await conversation.update({
      lastMessageAt: new Date(),
      lastMessageContent: "Tous les messages ont été supprimés"
    });
    
    res.status(200).json({ message: "Tous les messages de cette conversation ont été supprimés" });
  } catch (error) {
    console.error("Erreur lors de la suppression des messages de la conversation:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Supprimer tous les messages d'un utilisateur spécifique
export const deleteUserMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Supprimer tous les messages envoyés par l'utilisateur
    await Message.destroy({ where: { senderId: userId } });
    
    res.status(200).json({ message: "Tous les messages de cet utilisateur ont été supprimés" });
  } catch (error) {
    console.error("Erreur lors de la suppression des messages de l'utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Supprimer les messages plus anciens qu'une certaine date
export const deleteOldMessages = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: "Veuillez spécifier une date" });
    }
    
    // Supprimer tous les messages plus anciens que la date spécifiée
    await Message.destroy({ 
      where: { 
        createdAt: { [Op.lt]: new Date(date) } 
      } 
    });
    
    res.status(200).json({ message: "Les messages antérieurs à cette date ont été supprimés" });
  } catch (error) {
    console.error("Erreur lors de la suppression des anciens messages:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};