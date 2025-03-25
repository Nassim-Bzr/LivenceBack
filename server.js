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

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

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

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté");

  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté");
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
