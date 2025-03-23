import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configuration d'axios avec le token
  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });

  // Charger les conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await api.get("/messages/conversations");
      setConversations(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user, api]);

  // Charger les messages d'une conversation
  const loadMessages = useCallback(async (conversationId) => {
    if (!user || !conversationId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`);
      setMessages(response.data);
      
      // Marquer les messages comme lus
      await api.put(`/messages/conversations/${conversationId}/read`);
      
      // Mettre à jour l'état de la conversation active
      const foundConversation = conversations.find(c => c.id === parseInt(conversationId));
      setActiveConversation(foundConversation);
      
      // Mettre à jour le compteur de messages non lus
      setConversations(prev => 
        prev.map(conv => 
          conv.id === parseInt(conversationId) 
            ? { ...conv, unreadCount: 0 } 
            : conv
        )
      );
    } catch (error) {
      console.error("Erreur lors du chargement des messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, api, conversations]);

  // Envoyer un message
  const sendMessage = useCallback(async (content) => {
    if (!user || !activeConversation) return;
    
    try {
      const response = await api.post(
        `/messages/conversations/${activeConversation.id}/messages`, 
        { content }
      );
      
      // Ajouter le nouveau message à la liste
      setMessages(prev => [...prev, response.data]);
      
      // Mettre à jour la dernière activité de la conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === activeConversation.id 
            ? { 
                ...conv, 
                lastMessageAt: new Date(), 
                lastMessageContent: content 
              } 
            : conv
        )
      );
      
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      throw error;
    }
  }, [user, activeConversation, api]);

  // Démarrer une conversation avec l'admin
  const startConversationWithAdmin = useCallback(async (initialMessage = "Bonjour, j'ai besoin d'assistance.") => {
    if (!user) return;
    
    try {
      const response = await api.post(
        "/messages/conversations/admin", 
        { initialMessage }
      );
      
      const { conversation, message } = response.data;
      
      // Ajouter la nouvelle conversation à la liste
      setConversations(prev => {
        // Vérifier si la conversation existe déjà
        const exists = prev.some(c => c.id === conversation.id);
        return exists 
          ? prev.map(c => c.id === conversation.id ? conversation : c) 
          : [conversation, ...prev];
      });
      
      // Définir la conversation active
      setActiveConversation(conversation);
      
      // Ajouter le message initial
      setMessages([message]);
      
      return { conversation, message };
    } catch (error) {
      console.error("Erreur lors du démarrage de la conversation avec l'admin:", error);
      throw error;
    }
  }, [user, api]);

  // Démarrer une nouvelle conversation
  const startConversation = useCallback(async (participantIds, initialMessage) => {
    if (!user) return;
    
    try {
      const response = await api.post(
        "/messages/conversations", 
        { participantIds, initialMessage }
      );
      
      const { conversation, message } = response.data;
      
      // Ajouter la nouvelle conversation à la liste
      setConversations(prev => [conversation, ...prev]);
      
      // Définir la conversation active
      setActiveConversation(conversation);
      
      // Ajouter le message initial
      setMessages([message]);
      
      return { conversation, message };
    } catch (error) {
      console.error("Erreur lors du démarrage de la conversation:", error);
      throw error;
    }
  }, [user, api]);

  // Charger les conversations à l'initialisation
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Rafraîchir les conversations périodiquement
  useEffect(() => {
    if (!user) return;
    
    const intervalId = setInterval(() => {
      loadConversations();
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(intervalId);
  }, [user, loadConversations]);

  return (
    <MessageContext.Provider
      value={{
        conversations,
        messages,
        activeConversation,
        loading,
        loadConversations,
        loadMessages,
        sendMessage,
        startConversation,
        startConversationWithAdmin,
        setActiveConversation
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => useContext(MessageContext);

export default MessageContext; 