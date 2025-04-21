import { User } from "../models/index.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Enregistrement d'un nouvel utilisateur
export const register = async (req, res) => {
  try {
    const { nom, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      email,
      password: hashedPassword,
      role: "user" // Par défaut, tous les nouveaux utilisateurs sont des "users"
    });

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Définir le cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    });

    // Renvoyer la réponse sans le mot de passe
    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement:", error);
    res.status(500).json({ message: "Erreur lors de l'enregistrement" });
  }
};

// Connexion d'un utilisateur
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Définir le cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    });

    // Renvoyer la réponse sans le mot de passe
    res.status(200).json({
      message: "Connexion réussie",
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

// Déconnexion d'un utilisateur
export const logout = (req, res) => {
  // Supprimer le cookie
  res.clearCookie("token");
  res.status(200).json({ message: "Déconnexion réussie" });
};

// Récupérer les informations de l'utilisateur courant
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔍 Récupération des infos de l'utilisateur:", userId);

    // Trouver l'utilisateur sans son mot de passe
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] }
    });

    if (!user) {
      console.log("❌ Utilisateur non trouvé avec ID:", userId);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    console.log("✅ Utilisateur trouvé:", user.email);
    res.status(200).json({
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        photo: user.photo,
        googleId: user.googleId
      }
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Fonction pour gérer l'authentification Google
export const googleAuth = async (req, res) => {
  try {
    console.log("⭐ Réception des données Google:", req.body);
    const { email, nom, googleId, photo } = req.body;

    // Vérification des données requises
    if (!email || !googleId) {
      console.log("❌ Données manquantes:", { email, googleId });
      return res.status(400).json({ message: "Email et GoogleID sont requis" });
    }

    // Vérifier que les modèles sont chargés correctement
    if (!User) {
      console.error("❌ Modèle User non défini");
      return res.status(500).json({ message: "Erreur interne du serveur: modèle non défini" });
    }

    console.log("🔍 Recherche de l'utilisateur par email:", email);
    
    // Rechercher l'utilisateur par email
    let user = await User.findOne({ where: { email } });
    console.log("🔍 Utilisateur trouvé:", user ? "Oui" : "Non");

    // Si l'utilisateur n'existe pas, le créer
    if (!user) {
      console.log("➕ Création d'un nouvel utilisateur");
      try {
        user = await User.create({
          email,
          nom: nom || "Utilisateur Google",
          password: Math.random().toString(36).slice(-10), // Mot de passe aléatoire
          googleId,
          photo,
          role: "client"
        });
        console.log("✅ Utilisateur créé avec succès:", user.id);
      } catch (createError) {
        console.error("❌ Erreur lors de la création de l'utilisateur:", createError);
        return res.status(500).json({ message: "Erreur lors de la création de l'utilisateur", error: createError.message });
      }
    } else {
      // Mettre à jour les informations Google si l'utilisateur existe déjà
      if (!user.googleId) {
        console.log("🔄 Mise à jour des informations Google pour l'utilisateur existant");
        try {
          await user.update({
            googleId,
            photo: photo || user.photo
          });
          console.log("✅ Utilisateur mis à jour avec succès");
        } catch (updateError) {
          console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", updateError);
          return res.status(500).json({ message: "Erreur lors de la mise à jour de l'utilisateur", error: updateError.message });
        }
      }
    }

    // Créer le token JWT
    console.log("🔑 Création du token JWT");
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Définir le cookie
    console.log("🍪 Configuration du cookie");
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Retourner les données de l'utilisateur et le token
    console.log("✅ Connexion avec Google réussie pour:", user.email);
    res.status(200).json({
      message: "Connexion avec Google réussie",
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        photo: user.photo
      },
      token
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'authentification Google:", error);
    res.status(500).json({ message: "Erreur d'authentification Google", error: error.message });
  }
}; 