import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const token = req.cookies.token; // 🔥 Récupère le token dans les cookies

  if (!token) {
    return res.status(401).json({ message: "Accès refusé, token manquant" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token invalide" });
    }
    req.user = user; // 🔥 On stocke l'utilisateur dans `req.user`
    next();
  });
};
