import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Appartement from "./Appartement.js"; // 🔥 Importer le modèle Appartement

const Disponibilite = sequelize.define("Disponibilite", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  appartementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Appartement, // 🔥 Utilisation directe du modèle
      key: "id",
    },
    onDelete: "CASCADE", // 🔥 Si un appartement est supprimé, on supprime ses disponibilités
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  }
});

// 🔥 Associer Disponibilite à Appartement
Appartement.hasMany(Disponibilite, { foreignKey: "appartementId", onDelete: "CASCADE" });
Disponibilite.belongsTo(Appartement, { foreignKey: "appartementId" });

export default Disponibilite;
