import express from "express";
import { ajouterAppartement, getAppartements, getAppartementById } from "../controllers/appartementController.js";
import { ajouterDisponibilites, getDisponibilites } from "../controllers/appartementController.js";
import { bloquerDate, verifierDisponibilite } from "../controllers/appartementController.js";
import { updateAppartement } from "../controllers/appartementController.js";

import { getAppartementBySlug } from "../controllers/appartementController.js";

const router = express.Router();

router.post("/", ajouterAppartement);
router.get("/", getAppartements);
router.get("/:id", getAppartementById);
router.get("/slug/:slug", getAppartementBySlug);
router.put("/:id", updateAppartement);

// 🔹 Bloquer des dates (admin)
router.post("/bloquer", bloquerDate);

// 🔹 Vérifier disponibilité d'un appartement
router.post("/verifier-disponibilite", verifierDisponibilite);

router.post("/disponibilites", ajouterDisponibilites); // Ajouter des disponibilités
router.get("/disponibilites/:appartementId", getDisponibilites); // Récupérer les dates disponibles

export default router;
