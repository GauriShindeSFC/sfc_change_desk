import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const TravelRequest = sequelize.define(
  'TravelRequest',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    requestCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true,
      field: 'request_code'
    },
    requesterId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'requester_id'
    },
    travellerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'traveller_name'
    },
    travellerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'traveller_email'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    travelMode: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'travel_mode'
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tripType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'trip_type'
    },
    travelClass: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'travel_class'
    },
    fromLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'from_location'
    },
    toLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'to_location'
    },
    departureDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'departure_date'
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'return_date'
    },
    preferredTimeSlot: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'preferred_time_slot'
    },
    isShortNotice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_short_notice'
    },
    bookingDetails: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: 'booking_details'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Pending Approval'
    },
    policyCertified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'policy_certified'
    },
    approvalHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'approval_history'
    }
  },
  {
    tableName: 'travel_requests',
    timestamps: true,
    underscored: true
  }
);
