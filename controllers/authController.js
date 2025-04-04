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

    // Trouver l'utilisateur sans son mot de passe
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] }
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json({
      user
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}; 