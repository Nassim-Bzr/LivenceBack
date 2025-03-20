import axios from "axios";
import dotenv from "dotenv";

dotenv.config(); // Charge les variables d'environnement si tu veux cacher ta clé

const API_KEY = "dw6aNx3wn0WtYPTs2CXdJ6cX8JVJ6YyW6iygjor1pt"; // Mets ta clé ici TEMPORAIREMENT

const checkAvailabilityWithFetch = async () => {
    try {
      const response = await fetch("https://api.smoobu.com/v1/availability", {
        method: "GET",
        headers: {
          "API-Key": API_KEY,
          "Content-Type": "application/json",
        },
      });
  
      console.log("🔍 Statut HTTP :", response.status);
      console.log("🔍 Type de réponse :", response.headers.get("content-type"));
  
      const data = await response.text(); // On récupère le contenu brut
      console.log("📄 Contenu brut :", data);
  
      if (response.status === 301 || response.status === 302) {
        console.error("🚨 Redirection détectée. L'API essaie de te rediriger.");
      }
  
      if (response.headers.get("content-type")?.includes("text/html")) {
        console.error("🚨 L'API retourne du HTML au lieu du JSON. Vérifie la clé API et l'URL.");
        return;
      }
  
      console.log("✅ Disponibilités récupérées :", JSON.parse(data));
    } catch (error) {
      console.error("❌ Erreur lors de l'appel à l'API Smoobu :", error);
    }
  };
  
  checkAvailabilityWithFetch();
  