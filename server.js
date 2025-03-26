import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import http from "http";
import { Server } from "socket.io";
import { sequelize } from "./models/index.js";
import userRoutes from "./routes/userRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import appartementRoutes from "./routes/appartementRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Attacher l'instance de socket.io à l'app pour y accéder dans les contrôleurs
app.set('io', io);

// Configuration de la session
app.use(session({
  secret: process.env.SESSION_SECRET || 'votre_secret_ici',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/users", userRoutes);
app.use("/reservations", reservationRoutes);
app.use("/api/appartements", appartementRoutes);
app.use("/messages", messageRoutes);

// Middleware pour vérifier le token JWT et stocker les sockets par ID utilisateur
const connectedUsers = new Map();

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté, ID socket:", socket.id);
  
  // Authentification de l'utilisateur via le token JWT
  socket.on("authenticate", (token) => {
    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      
      // Stocker la socket de l'utilisateur
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, new Set());
      }
      connectedUsers.get(userId).add(socket.id);
      
      // Rejoindre une room spécifique à cet utilisateur
      socket.join(`user_${userId}`);
      
      console.log(`Utilisateur ${userId} authentifié, socket ID: ${socket.id}`);
      
      // Informer le client que l'authentification a réussi
      socket.emit("authenticated", { userId });
    } catch (error) {
      console.error("Erreur d'authentification socket:", error);
      socket.emit("auth_error", { message: "Authentification échouée" });
    }
  });
  
  // Écouter les nouveaux messages
  socket.on("send_message", async (data) => {
    const { receiverId, contenu, type, appartementId } = data;
    
    // Le message est déjà sauvegardé via l'API REST, ici on gère juste la notification en temps réel
    if (connectedUsers.has(receiverId)) {
      // Envoyer à toutes les sockets de cet utilisateur
      io.to(`user_${receiverId}`).emit("new_message", data);
    }
  });
  
  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté, ID socket:", socket.id);
    
    // Supprimer ce socket ID de tous les utilisateurs connectés
    for (const [userId, sockets] of connectedUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedUsers.delete(userId);
        }
        break;
      }
    }
  });
});

// Synchronisation de la base de données et démarrage du serveur
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true })
  .then(() => {
    console.log("Base de données synchronisée");
    server.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erreur lors de la synchronisation de la base de données:", error);
  });
