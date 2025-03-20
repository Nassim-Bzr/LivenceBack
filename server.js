import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; // 🔥 Import nécessaire pour gérer les cookies

import sequelize from "./config/database.js";

// Import des modèles pour qu'ils soient enregistrés avant la synchronisation
import User from "./models/User.js";
import Reservation from "./models/Reservation.js";
import Appartement from "./models/Appartement.js";

import userRoutes from "./routes/userRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import appartementRoutes from "./routes/appartementRoutes.js";

dotenv.config();


const app = express();
app.use(express.json());
app.use(cookieParser()); // 🔥 Nécessaire pour lire les cookies

// ✅ Configuration CORS CORRECTE

app.use(cors({
  origin: "http://localhost:3000",  // Autoriser uniquement le front React
  credentials: true // Permettre les cookies et tokens dans les requêtes
}));

app.use(express.json());

// Routes API
app.use("/users", userRoutes);
app.use("/reservations", reservationRoutes);
app.use("/api/appartements", appartementRoutes);

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    console.log("🔄 Synchronisation de la base de données...");
    await sequelize.sync({ alter: true }); // Mettre à jour les tables sans tout supprimer
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  } catch (error) {
    console.error("❌ Erreur de connexion à MySQL :", error);
  }
});
