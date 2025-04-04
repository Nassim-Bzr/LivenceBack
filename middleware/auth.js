import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  try {
    // Récupérer le token depuis le cookie ou l'en-tête Authorization
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajouter les informations de l'utilisateur à la requête
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    return res.status(401).json({ message: "Token invalide" });
  }
}; 