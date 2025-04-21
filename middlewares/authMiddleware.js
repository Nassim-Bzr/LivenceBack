import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  try {
    // Récupérer le token depuis le cookie ou l'en-tête Authorization
    const authHeader = req.headers.authorization;
    const token = req.cookies?.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
    
    console.log("🔐 Vérification du token:", token ? "Token présent" : "Token manquant");
    
    if (!token) {
      console.log("❌ Authentification échouée: token manquant");
      return res.status(401).json({ message: "Accès refusé, token manquant" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log("❌ Authentification échouée: token invalide", err.message);
        return res.status(403).json({ message: "Token invalide" });
      }
      
      console.log("✅ Authentification réussie pour l'utilisateur:", user.email);
      req.user = user; // 🔥 On stocke l'utilisateur dans `req.user`
      next();
    });
  } catch (error) {
    console.error("❌ Erreur dans le middleware d'authentification:", error);
    return res.status(500).json({ message: "Erreur serveur lors de l'authentification" });
  }
};
