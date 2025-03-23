import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Conversation from "./Conversation.js";

const Message = sequelize.define("Message", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  content: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  isRead: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  }
});

// Relations
Message.belongsTo(User, { 
  foreignKey: "senderId", 
  as: "sender" 
});
Message.belongsTo(Conversation, { 
  foreignKey: "conversationId", 
  as: "conversation" 
});

// Relations inverses
User.hasMany(Message, { 
  foreignKey: "senderId", 
  as: "sentMessages" 
});
Conversation.hasMany(Message, { 
  foreignKey: "conversationId", 
  as: "messages",
  onDelete: "CASCADE" 
});

export default Message; 