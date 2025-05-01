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
import authRoutes from "./routes/authRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import smoobuRoutes from "./routes/smoobuRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:8081",
      "https://livence-project-booking.vercel.app",
      "https://livence-project-booking-8ykrxq879-nassimbzrs-projects.vercel.app"
    ],
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
const corsOptions = {
  origin: [
    "http://localhost:3000", 
    "http://localhost:8081", 
    "https://livence-project-booking.vercel.app",
    "https://livence-project-booking-8ykrxq879-nassimbzrs-projects.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/appartements", appartementRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/smoobu", smoobuRoutes);

// Middleware pour ajouter l'instance socket.io à toutes les requêtes
app.use((req, res, next) => {
  req.io = io;
  next();
});

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
      
      // Stocker l'ID de l'utilisateur dans l'objet socket
      socket.userId = userId;
      
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
  
  // Gérer les notifications "est en train d'écrire"
  socket.on("typing_start", (receiverId) => {
    console.log(`Utilisateur ${socket.userId} est en train d'écrire à l'utilisateur ${receiverId}`);
    io.to(`user_${receiverId}`).emit("typing_start", socket.userId);
  });
  
  socket.on("typing_stop", (receiverId) => {
    console.log(`Utilisateur ${socket.userId} a arrêté d'écrire à l'utilisateur ${receiverId}`);
    io.to(`user_${receiverId}`).emit("typing_stop", socket.userId);
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

// Synchroniser la base de données et créer les tables
sequelize.authenticate()
  .then(() => {
    console.log('Connexion à la base de données établie avec succès.');
    
    // Utiliser alter: true au lieu de force: true pour mettre à jour les tables sans perdre les données
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log("Base de données synchronisée - Connexion réussie");
    console.log("Tables mises à jour avec les nouvelles colonnes");
    server.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erreur lors de la connexion ou synchronisation de la base de données:", error);
  });

// Gérer la fermeture propre
process.on('SIGTERM', () => {
  console.log('SIGTERM signal reçu: fermeture du serveur');
  server.close(() => {
    console.log('Serveur HTTP fermé');
    // Fermer la connexion à la base de données
    sequelize.close().then(() => {
      console.log('Connexion à la base de données fermée');
      process.exit(0);
    });
  });
});
