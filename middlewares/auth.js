// middleware/auth.js
import User from "../models/User.js";

const authenticateUser = async (req, res, next) => {
  try {
    // Vérifier le cookie de session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Récupérer l'utilisateur
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur d'authentification" });
  }
};

export default authenticateUser;