import Reservation from "../models/Reservation.js";
import Appartement from "../models/Appartement.js";
import Disponibilite from "../models/Disponibilite.js"; // 🔥 Import du modèle pour bloquer les dates
import { Op } from "sequelize";
import { User } from "../models/index.js"; // 🔥 Import User depuis index.js

// 🔹 Créer une réservation
export const createReservation = async (req, res) => {
  const { appartementId, startDate, endDate, totalPrice } = req.body;
  const userId = req.user.id; // 🔥 Récupéré depuis le token

  try {
    // ➤ Vérifier si les dates sont déjà bloquées
    const existingDates = await Disponibilite.findOne({
      where: {
        appartementId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    if (existingDates) {
      return res.status(400).json({ message: "Certaines dates sont déjà réservées !" });
    }

    // ➤ Créer la réservation
    const reservation = await Reservation.create({
      userId,
      appartementId,
      startDate,
      endDate,
      totalPrice,
      status: "en attente",
    });

    // ➤ Bloquer les dates en les ajoutant dans `Disponibilite`
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      await Disponibilite.create({
        appartementId,
        date: currentDate,
      });
      currentDate.setDate(currentDate.getDate() + 1); // 🔥 Passer au jour suivant
    }

    res.status(201).json({ message: "Réservation effectuée avec succès", reservation });

  } catch (error) {
    console.error("❌ Erreur lors de la réservation :", error);
    res.status(500).json({ message: "Erreur lors de la réservation", error });
  }
};

export const getUserReservations = async (req, res) => {
  const userId = req.user.id;

  try {
    const reservations = await Reservation.findAll({
      where: { userId },
      include: [
        {
          model: Appartement,
          as: "appartement",
          attributes: ["titre", "localisation", "images"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "nom", "email"], // Ajout de l'ID explicitement
        }
      ],
    });

    console.log("🔍 Réservations trouvées :", reservations);
    res.status(200).json(reservations);
  } catch (error) {
    console.error("❌ Erreur récupération réservations backend :", error);
    res.status(500).json({ message: "Erreur lors de la récupération des réservations", error });
  }
};

// 🔹 Mettre à jour le statut d'une réservation
export const updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  try {
    // Vérifier que le statut est valide
    const validStatuses = ["en attente", "confirmée", "annulée", "terminée"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Statut invalide", 
        validStatuses 
      });
    }

    // Récupérer la réservation
    const reservation = await Reservation.findByPk(id);
    
    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }

    // Vérifier que l'utilisateur est le propriétaire de la réservation ou un admin
    const user = await User.findByPk(userId);
    if (reservation.userId !== userId && user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette réservation" });
    }

    // Mettre à jour le statut
    await reservation.update({ status });

    // Si la réservation est annulée, libérer les dates
    if (status === "annulée") {
      await Disponibilite.destroy({
        where: {
          appartementId: reservation.appartementId,
          date: {
            [Op.between]: [reservation.startDate, reservation.endDate]
          }
        }
      });
    }

    res.status(200).json({ 
      message: "Statut de la réservation mis à jour avec succès",
      reservation
    });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du statut :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut", error });
  }
};

// 🔹 Récupérer les détails d'une réservation
export const getReservationById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Appartement,
          as: "appartement",
          attributes: ["titre", "localisation", "images", "prixParNuit"]
        },
        {
          model: User,
          as: "user",
          attributes: ["nom", "email"]
        }
      ]
    });

    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }

    // Vérifier que l'utilisateur est le propriétaire de la réservation ou un admin
    const user = await User.findByPk(userId);
    if (reservation.userId !== userId && user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à accéder à cette réservation" });
    }

    res.status(200).json(reservation);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la réservation :", error);
    res.status(500).json({ message: "Erreur lors de la récupération de la réservation", error });
  }
};

// 🔹 Récupérer toutes les réservations (admin uniquement)
// 🔹 Récupérer toutes les réservations (admin uniquement)
export const getAllReservations = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    const reservations = await Reservation.findAll({
      include: [
        {
          model: Appartement,
          as: "appartement",
          attributes: ["titre", "localisation", "images"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "nom", "email"], // Ajout de l'ID explicitement
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.status(200).json(reservations);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de toutes les réservations:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
