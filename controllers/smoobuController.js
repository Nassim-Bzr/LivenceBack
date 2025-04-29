import Reservation from "../models/Reservation.js";
import Appartement from "../models/Appartement.js";
import Disponibilite from "../models/Disponibilite.js";
import { User } from "../models/index.js";
import { Op } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Clé API Smoobu pour vérification des requêtes entrantes
const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;

/**
 * Webhook recevant les événements de réservation Smoobu
 * Endpoint qui sera appelé par Smoobu lorsqu'une réservation est créée/modifiée
 */
export const smoobuWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    // Vérifier la clé d'authentification (optionnel mais recommandé)
    const apiKey = req.headers['x-api-key'];
    if (SMOOBU_API_KEY && apiKey !== SMOOBU_API_KEY) {
      console.error("❌ Clé API invalide pour le webhook Smoobu");
      return res.status(401).json({ message: "Clé API non valide" });
    }

    console.log("📝 Événement Smoobu reçu:", event);
    console.log("📝 Données reçues:", data);

    // Gérer les différents types d'événements
    switch (event) {
      case 'reservation.created':
        await handleReservationCreated(data);
        break;
      case 'reservation.updated':
        await handleReservationUpdated(data);
        break;
      case 'reservation.cancelled':
        await handleReservationCancelled(data);
        break;
      default:
        console.log(`📝 Événement ${event} non traité`);
    }

    res.status(200).json({ success: true, message: "Webhook reçu avec succès" });
  } catch (error) {
    console.error("❌ Erreur lors du traitement du webhook Smoobu:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors du traitement du webhook", 
      error: error.message 
    });
  }
};

/**
 * Endpoint pour gérer les notifications de réservation depuis le frontend
 * Utilisé lorsqu'un utilisateur effectue une réservation via le widget Smoobu intégré
 */
export const handleReservationNotification = async (req, res) => {
  try {
    // Ces données viennent du frontend après une réservation réussie via Smoobu
    const { 
      appartementId,
      smoobuId,
      smoobuReservationId,
      startDate,
      endDate,
      totalPrice,
      guestEmail,
      status, 
      guestsCount
    } = req.body;

    console.log("📱 Notification de réservation Smoobu reçue du frontend:", req.body);
    
    // Vérifier que l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }
    
    // Vérifier si la réservation existe déjà (pour éviter les doublons)
    const existingReservation = await Reservation.findOne({
      where: { smoobuReservationId }
    });
    
    if (existingReservation) {
      return res.status(200).json({ 
        message: "Cette réservation existe déjà dans notre système", 
        reservation: existingReservation 
      });
    }

    // Créer une nouvelle réservation
    const reservation = await Reservation.create({
      userId: req.user.id,
      appartementId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalPrice: parseFloat(totalPrice) || 0,
      status: mapSmoobuStatusToLocal(status),
      guestsCount: parseInt(guestsCount) || 1,
      smoobuReservationId
    });

    // Bloquer les dates dans le calendrier
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      await Disponibilite.create({
        appartementId,
        date: new Date(currentDate) // Créer une nouvelle instance pour éviter les références
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log("✅ Réservation Smoobu (notification frontend) enregistrée avec succès:", reservation.id);

    // Retourner la réservation créée
    res.status(201).json({ 
      success: true, 
      message: "Réservation enregistrée avec succès",
      reservation
    });
  } catch (error) {
    console.error("❌ Erreur lors du traitement de la notification de réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'enregistrement de la réservation", 
      error: error.message 
    });
  }
};

/**
 * Gère la création d'une nouvelle réservation depuis Smoobu
 */
const handleReservationCreated = async (data) => {
  try {
    // Rechercher l'appartement par son ID Smoobu
    const appartement = await Appartement.findOne({
      where: { smoobuId: data.apartmentId }
    });

    if (!appartement) {
      throw new Error(`Appartement avec smoobuId ${data.apartmentId} non trouvé`);
    }

    // Chercher l'utilisateur ou utiliser l'administrateur par défaut si non trouvé
    let userId = null;
    
    if (data.guestEmail) {
      const user = await User.findOne({ where: { email: data.guestEmail } });
      if (user) {
        userId = user.id;
      } else {
        // Créer un utilisateur temporaire ou trouver l'administrateur
        const admin = await User.findOne({ where: { role: 'admin' } });
        userId = admin ? admin.id : null;
      }
    }
    
    if (!userId) {
      throw new Error("Impossible de déterminer l'utilisateur pour cette réservation");
    }

    // Créer la réservation
    const reservation = await Reservation.create({
      userId,
      appartementId: appartement.id,
      startDate: new Date(data.arrivalDate),
      endDate: new Date(data.departureDate),
      totalPrice: data.totalAmount || 0,
      status: mapSmoobuStatusToLocal(data.status),
      guestsCount: data.numberOfGuests || 1,
      // Ajouter des données additionnelles de Smoobu si nécessaire
      smoobuReservationId: data.reservationId || data.id
    });

    // Bloquer les dates dans le calendrier
    let currentDate = new Date(data.arrivalDate);
    const end = new Date(data.departureDate);

    while (currentDate <= end) {
      await Disponibilite.create({
        appartementId: appartement.id,
        date: currentDate
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log("✅ Réservation Smoobu créée avec succès:", reservation.id);

    return reservation;
  } catch (error) {
    console.error("❌ Erreur lors de la création de la réservation depuis Smoobu:", error);
    throw error;
  }
};

/**
 * Gère la mise à jour d'une réservation existante depuis Smoobu
 */
const handleReservationUpdated = async (data) => {
  try {
    // Trouver la réservation par son ID Smoobu
    const reservation = await Reservation.findOne({
      where: { smoobuReservationId: data.reservationId || data.id }
    });

    if (!reservation) {
      console.warn(`⚠️ Réservation avec smoobuReservationId ${data.reservationId || data.id} non trouvée`);
      // Si la réservation n'existe pas, on la crée
      return await handleReservationCreated(data);
    }

    // Mettre à jour les dates et libérer les anciennes dates bloquées
    await Disponibilite.destroy({
      where: {
        appartementId: reservation.appartementId,
        date: {
          [Op.between]: [reservation.startDate, reservation.endDate]
        }
      }
    });

    // Mettre à jour la réservation
    await reservation.update({
      startDate: new Date(data.arrivalDate),
      endDate: new Date(data.departureDate),
      totalPrice: data.totalAmount || reservation.totalPrice,
      status: mapSmoobuStatusToLocal(data.status),
      guestsCount: data.numberOfGuests || reservation.guestsCount
    });

    // Bloquer les nouvelles dates
    let currentDate = new Date(data.arrivalDate);
    const end = new Date(data.departureDate);

    while (currentDate <= end) {
      await Disponibilite.create({
        appartementId: reservation.appartementId,
        date: currentDate
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log("✅ Réservation Smoobu mise à jour avec succès:", reservation.id);

    return reservation;
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de la réservation depuis Smoobu:", error);
    throw error;
  }
};

/**
 * Gère l'annulation d'une réservation depuis Smoobu
 */
const handleReservationCancelled = async (data) => {
  try {
    // Trouver la réservation par son ID Smoobu
    const reservation = await Reservation.findOne({
      where: { smoobuReservationId: data.reservationId || data.id }
    });

    if (!reservation) {
      console.warn(`⚠️ Réservation à annuler avec smoobuReservationId ${data.reservationId || data.id} non trouvée`);
      return null;
    }

    // Mettre à jour le statut
    await reservation.update({
      status: "annulée"
    });

    // Libérer les dates bloquées
    await Disponibilite.destroy({
      where: {
        appartementId: reservation.appartementId,
        date: {
          [Op.between]: [reservation.startDate, reservation.endDate]
        }
      }
    });

    console.log("✅ Réservation Smoobu annulée avec succès:", reservation.id);

    return reservation;
  } catch (error) {
    console.error("❌ Erreur lors de l'annulation de la réservation depuis Smoobu:", error);
    throw error;
  }
};

/**
 * Convertit les statuts Smoobu en statuts locaux
 */
const mapSmoobuStatusToLocal = (smoobuStatus) => {
  // Mapping des statuts Smoobu vers les statuts de notre application
  switch (smoobuStatus.toLowerCase()) {
    case 'confirmed':
    case 'booked':
      return 'confirmée';
    case 'pending':
    case 'inquiry':
      return 'en attente';
    case 'cancelled':
      return 'annulée';
    case 'completed':
    case 'checked-out':
      return 'terminée';
    default:
      return 'en attente';
  }
};

/**
 * Vérifie la disponibilité d'un appartement entre deux dates
 */
export const checkSmoobuAvailability = async (req, res) => {
  try {
    const { appartementId, startDate, endDate } = req.body;
    
    // Implémentez ici la logique pour vérifier la disponibilité via l'API Smoobu
    // Cette fonction peut être utilisée si vous souhaitez effectuer des vérifications
    // côté serveur avant de laisser un utilisateur réserver

    res.status(200).json({ available: true });
  } catch (error) {
    console.error("❌ Erreur lors de la vérification de disponibilité:", error);
    res.status(500).json({ message: "Erreur lors de la vérification", error: error.message });
  }
}; 