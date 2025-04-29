import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Appartement from "./Appartement.js";
import User from "./User.js";

const Reservation = sequelize.define("Reservation", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  appartementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Appartements",
      key: "id",
    },
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "en attente",
  },
  guestsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  smoobuReservationId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "ID de la réservation dans le système Smoobu",
  },
});

// 🔥 Définition des associations
// 🔥 Définition des associations

export default Reservation;
