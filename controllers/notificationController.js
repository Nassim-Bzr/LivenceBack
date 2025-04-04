import Notification from "../models/Notification.js";

// Récupérer les notifications d'un utilisateur
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notifications = await Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]]
    });

    res.json(notifications);
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des notifications" });
  }
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification non trouvée" });
    }

    await notification.update({ read: true });

    res.json(notification);
  } catch (error) {
    console.error("Erreur lors du marquage de la notification comme lue:", error);
    res.status(500).json({ message: "Erreur lors du marquage de la notification" });
  }
};

// Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { read: true },
      { where: { userId, read: false } }
    );

    res.json({ message: "Toutes les notifications ont été marquées comme lues" });
  } catch (error) {
    console.error("Erreur lors du marquage des notifications comme lues:", error);
    res.status(500).json({ message: "Erreur lors du marquage des notifications" });
  }
};

// Supprimer une notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification non trouvée" });
    }

    await notification.destroy();

    res.json({ message: "Notification supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la notification:", error);
    res.status(500).json({ message: "Erreur lors de la suppression de la notification" });
  }
}; 