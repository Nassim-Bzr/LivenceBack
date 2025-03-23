import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";

const Conversation = sequelize.define("Conversation", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  lastMessageAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  lastMessageContent: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
});

// Relation many-to-many avec User via ConversationParticipant (implicite)
Conversation.belongsToMany(User, { 
  through: "ConversationParticipant",
  as: "participants"
});
User.belongsToMany(Conversation, { 
  through: "ConversationParticipant", 
  as: "conversations" 
});

export default Conversation; 