import Appartement from "../models/Appartement.js";
import Disponibilite from "../models/Disponibilite.js";
import { Op } from "sequelize";

// ➤ Récupérer un appartement par SLUG
export const getAppartementBySlug = async (req, res) => {
  try {
    const appartement = await Appartement.findOne({ where: { slug: req.params.slug } });
    if (!appartement) return res.status(404).json({ message: "Appartement non trouvé" });

    res.status(200).json(appartement);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'appartement", error });
  }
};

// ➤ Ajouter un appartement
export const ajouterAppartement = async (req, res) => {
  try {
    // Vérification uniquement pour le slug
    if (req.body.slug) {
      const existingSlug = await Appartement.findOne({
        where: { slug: req.body.slug }
      });
      
      if (existingSlug) {
        return res.status(400).json({ 
          message: "Un appartement avec ce slug existe déjà" 
        });
      }
    }

    const appartement = await Appartement.create(req.body);
    res.status(201).json(appartement);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout de l'appartement", error });
  }
};

// ➤ Mettre à jour un appartement
export const updateAppartement = async (req, res) => {
  try {
    const appartement = await Appartement.findByPk(req.params.id);
    if (!appartement) return res.status(404).json({ message: "Appartement non trouvé" });

    // Si un nouveau slug est fourni, vérifier qu'il n'existe pas déjà
    if (req.body.slug && req.body.slug !== appartement.slug) {
      const existingSlug = await Appartement.findOne({
        where: { 
          slug: req.body.slug,
          id: { [Op.ne]: req.params.id } // Exclure l'appartement actuel
        }
      });
      
      if (existingSlug) {
        return res.status(400).json({ 
          message: "Un appartement avec ce slug existe déjà" 
        });
      }
    }

    await appartement.update(req.body);
    res.status(200).json({ message: "Appartement mis à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'appartement", error });
  }
};

// ➤ Supprimer un appartement
export const deleteAppartement = async (req, res) => {
  try {
    const appartement = await Appartement.findByPk(req.params.id);
    if (!appartement) {
      return res.status(404).json({ message: "Appartement non trouvé" });
    }

    // Supprimer d'abord les disponibilités associées
    await Disponibilite.destroy({
      where: { appartementId: req.params.id }
    });

    // Puis supprimer l'appartement
    await appartement.destroy();
    
    res.status(200).json({ message: "Appartement et ses disponibilités supprimés avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de l'appartement", error });
  }
};

// 🔹 Ajouter une date bloquée (bloquer un appart)
export const bloquerDate = async (req, res) => {
  const { appartementId, dates } = req.body; // Liste de dates à bloquer

  try {
    const nouvellesIndispo = dates.map((date) => ({
      appartementId,
      date
    }));

    await Disponibilite.bulkCreate(nouvellesIndispo);
    res.status(201).json({ message: "Dates bloquées avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du blocage des dates", error });
  }
};

// 🔹 Vérifier si un appartement est dispo sur une période
export const verifierDisponibilite = async (req, res) => {
  const { appartementId, dateArrivee, dateDepart } = req.body;

  try {
    console.log("🔍 Vérification de disponibilité pour :", appartementId, dateArrivee, dateDepart);

    const datesBloquees = await Disponibilite.findAll({
      where: {
        appartementId,
        date: { 
          [Op.between]: [dateArrivee, dateDepart]
        }
      },
    });

    console.log("📅 Dates bloquées trouvées :", datesBloquees);

    if (datesBloquees.length > 0) {
      return res.status(400).json({ disponible: false, message: "Certaines dates sont bloquées" });
    }

    res.status(200).json({ disponible: true, message: "L'appartement est disponible" });
  } catch (error) {
    console.error("❌ Erreur lors de la vérification de disponibilité :", error);
    res.status(500).json({ message: "Erreur lors de la vérification de disponibilité", error });
  }
};

export const ajouterDisponibilites = async (req, res) => {
  const { appartementId, dates } = req.body; // dates = ["2025-03-20", "2025-03-21"]

  try {
    const nouvellesDispos = dates.map((date) => ({
      appartementId,
      date,
      disponible: true,
    }));

    await Disponibilite.bulkCreate(nouvellesDispos);
    res.status(201).json({ message: "Disponibilités ajoutées avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout des disponibilités", error });
  }
};

export const getDisponibilites = async (req, res) => {
  const { appartementId } = req.params;

  try {
    const datesBloquees = await Disponibilite.findAll({
      where: { appartementId },
      attributes: ["date"],
    });

    res.status(200).json(datesBloquees);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des dates bloquées", error });
  }
};

// ➤ Récupérer tous les appartements
export const getAppartements = async (req, res) => {
  try {
    const appartements = await Appartement.findAll();
    res.status(200).json(appartements);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des appartements", error });
  }
};

// ➤ Récupérer un appartement par ID
export const getAppartementById = async (req, res) => {
  try {
    const appartement = await Appartement.findByPk(req.params.id);
    if (!appartement) return res.status(404).json({ message: "Appartement non trouvé" });

    res.status(200).json(appartement);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'appartement", error });
  }
};
