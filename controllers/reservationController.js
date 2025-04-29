import Reservation from "../models/Reservation.js";
import Appartement from "../models/Appartement.js";
import Disponibilite from "../models/Disponibilite.js"; // 🔥 Import du modèle pour bloquer les dates
import { Op } from "sequelize";
import { User } from "../models/index.js"; // 🔥 Import User depuis index.js

// 🔹 Créer une réservation
export const createReservation = async (req, res) => {
  console.log("📥 Données reçues dans le body :", req.body);
console.log("👤 Utilisateur connecté :", req.user);

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

// 🔹 Vérifier si une réservation Smoobu existe déjà
export const checkSmoobuReservation = async (req, res) => {
  const { smoobuId } = req.params;

  try {
    const reservation = await Reservation.findOne({
      where: { smoobuReservationId: smoobuId }
    });

    if (reservation) {
      return res.status(200).json({ 
        exists: true, 
        id: reservation.id,
        status: reservation.status 
      });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification de la réservation Smoobu:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Mettre à jour une réservation existante
export const updateReservation = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Récupérer la réservation
    const reservation = await Reservation.findByPk(id);
    
    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }

    // Vérifier que l'utilisateur est le propriétaire de la réservation ou un admin
    const user = await User.findByPk(req.user.id);
    if (reservation.userId !== req.user.id && user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette réservation" });
    }

    // Si le statut change, il faut gérer différemment les dates
    if (updateData.status && updateData.status !== reservation.status) {
      if (updateData.status === "annulée" && reservation.status !== "annulée") {
        // Si on annule la réservation, libérer les dates
        await Disponibilite.destroy({
          where: {
            appartementId: reservation.appartementId,
            date: {
              [Op.between]: [reservation.startDate, reservation.endDate]
            }
          }
        });
      } else if (reservation.status === "annulée" && updateData.status !== "annulée") {
        // Si on réactive une réservation annulée, bloquer les dates
        let currentDate = new Date(reservation.startDate);
        const end = new Date(reservation.endDate);

        while (currentDate <= end) {
          await Disponibilite.create({
            appartementId: reservation.appartementId,
            date: new Date(currentDate)
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    // Si les dates changent, mettre à jour les disponibilités
    if ((updateData.startDate && updateData.startDate !== reservation.startDate) ||
        (updateData.endDate && updateData.endDate !== reservation.endDate)) {
      
      // Supprimer les anciennes dates bloquées
      await Disponibilite.destroy({
        where: {
          appartementId: reservation.appartementId,
          date: {
            [Op.between]: [reservation.startDate, reservation.endDate]
          }
        }
      });

      // Bloquer les nouvelles dates si la réservation n'est pas annulée
      if (updateData.status !== "annulée") {
        const startDate = updateData.startDate || reservation.startDate;
        const endDate = updateData.endDate || reservation.endDate;

        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
          await Disponibilite.create({
            appartementId: reservation.appartementId,
            date: new Date(currentDate)
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    // Mettre à jour la réservation
    await reservation.update(updateData);

    res.status(200).json({
      message: "Réservation mise à jour avec succès",
      reservation
    });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de la réservation:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
