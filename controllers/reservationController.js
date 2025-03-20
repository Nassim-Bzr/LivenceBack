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

// 🔹 Récupérer les réservations de l'utilisateur connecté
export const getUserReservations = async (req, res) => {
  const userId = req.user.id;

  try {
    const reservations = await Reservation.findAll({
      where: { userId },
      include: [
        {
          model: Appartement,
          as: "appartement", // 🔥 Doit être identique au alias défini dans l'association
          attributes: ["titre", "localisation", "images"],
        },
        {
          model: User,
          as: "user",
          attributes: ["nom", "email"],
        }
      ],
    });

    console.log("🔍 Réservations trouvées :", reservations); // 🔥 Debug
    res.status(200).json(reservations);
  } catch (error) {
    console.error("❌ Erreur récupération réservations backend :", error);
    res.status(500).json({ message: "Erreur lors de la récupération des réservations", error });
  }
};
