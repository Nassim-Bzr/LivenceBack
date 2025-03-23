import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Reservation from "./Reservation.js";

const Appartement = sequelize.define("Appartement", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  smoobuId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  slug: { 
    type: DataTypes.STRING, 
    allowNull: true, // temporairement
  },
  titre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  localisation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  surface: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  prixParNuit: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  capacite: {
    type: DataTypes.JSON, // Stocke les voyageurs, chambres, lits, etc.
    allowNull: true,
  },
  note: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  nombreAvis: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  hote: {
    type: DataTypes.JSON, // Stocke les infos de l'hôte
    allowNull: true,
  },
  regles: {
    type: DataTypes.JSON, // Stocke les règles de location
    allowNull: true,
  },
  images: {
    type: DataTypes.JSON, // Stocke les URLs des images sous forme de tableau
    allowNull: true,
  },
  equipements: {
    type: DataTypes.JSON, // Stocke les équipements sous forme de tableau
    allowNull: true,
  },
  inclus: {
    type: DataTypes.JSON, // Stocke les services inclus sous forme de tableau
    allowNull: true,
  },
  nonInclus: {
    type: DataTypes.JSON, // Stocke ce qui n'est pas inclus
    allowNull: true,
  },
  politiqueAnnulation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});


export default Appartement;
