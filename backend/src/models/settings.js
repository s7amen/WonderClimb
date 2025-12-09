import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  instructorOpenRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  instructorAssistantOpenRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  gymInitialBalance: {
    type: Number,
    default: 0,
  },
  trainingInitialBalance: {
    type: Number,
    default: 0,
  },
  // Message fields for user-facing error messages
  sessionNotFound: {
    type: String,
    default: 'Тренировката не е намерена',
  },
  sessionNotActive: {
    type: String,
    default: 'Тренировката не е активна',
  },
  sessionOutsideBookingHorizon: {
    type: String,
    default: 'Тренировката е извън периода за записване',
  },
  cannotBookPastSessions: {
    type: String,
    default: 'Не можете да се запишете за минали тренировки',
  },
  climberNotFound: {
    type: String,
    default: 'Катерачът не е намерен',
  },
  climberCanOnlyBookForSelf: {
    type: String,
    default: 'Можете да правите записвания само за себе си и свързаните деца',
  },
  userMustHaveClimberRole: {
    type: String,
    default: 'Потребителят трябва да има роля "катерач"',
  },
  alreadyRegistered: {
    type: String,
    default: 'Вече сте записани за тази тренировка',
  },
  sessionFull: {
    type: String,
    default: 'Тренировката е пълна',
  },
  bookingNotFound: {
    type: String,
    default: 'Записването не е намерено',
  },
  bookingAlreadyCancelled: {
    type: String,
    default: 'Записването вече е отменено',
  },
  cannotCancelOwnBookings: {
    type: String,
    default: 'Можете да отменяте само собствени записвания',
  },
  cancellationPeriodExpired: {
    type: String,
    default: 'Периодът за отмяна е изтекъл',
  },
}, {
  timestamps: true,
});

export const Settings = mongoose.model('Settings', settingsSchema);







