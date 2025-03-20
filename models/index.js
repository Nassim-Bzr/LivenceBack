import sequelize from "../config/database.js";
import User from "./User.js";
import Appartement from "./Appartement.js";
import Reservation from "./Reservation.js";

// 🔥 Définition des relations après les imports
User.hasMany(Reservation, { foreignKey: "userId", as: "reservations" });
Reservation.belongsTo(User, { foreignKey: "userId", as: "user" });

Appartement.hasMany(Reservation, { foreignKey: "appartementId", as: "reservations" });
Reservation.belongsTo(Appartement, { foreignKey: "appartementId", as: "appartement" });

export { sequelize, User, Appartement, Reservation };
