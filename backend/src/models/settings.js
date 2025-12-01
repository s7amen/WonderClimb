import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Cancellation messages
  cancellationPeriodExpired: {
    type: String,
    default: 'Периодът за отмяна е изтекъл',
    trim: true,
  },
  
  // Booking messages
  bookingNotFound: {
    type: String,
    default: 'Резервацията не е намерена',
    trim: true,
  },
  bookingAlreadyCancelled: {
    type: String,
    default: 'Резервацията вече е отменена',
    trim: true,
  },
  cannotCancelOwnBookings: {
    type: String,
    default: 'Можете да отменяте само собствените си резервации',
    trim: true,
  },
  alreadyRegistered: {
    type: String,
    default: 'Вече е регистриран за тази тренировка',
    trim: true,
  },
  
  // Session messages
  sessionNotFound: {
    type: String,
    default: 'Сесията не е намерена',
    trim: true,
  },
  sessionNotActive: {
    type: String,
    default: 'Сесията не е активна',
    trim: true,
  },
  sessionFull: {
    type: String,
    default: 'Сесията е пълна',
    trim: true,
  },
  sessionOutsideBookingHorizon: {
    type: String,
    default: 'Сесията е извън периода за резервиране',
    trim: true,
  },
  cannotBookPastSessions: {
    type: String,
    default: 'Не можете да резервирате минали сесии',
    trim: true,
  },
  cannotReduceCapacity: {
    type: String,
    default: 'Не можете да намалите капацитета под {count} (текущи резервации)',
    trim: true,
  },
  atLeastOneDayRequired: {
    type: String,
    default: 'Трябва да изберете поне един ден от седмицата',
    trim: true,
  },
  noValidSessions: {
    type: String,
    default: 'Няма валидни сесии за създаване в посочения период',
    trim: true,
  },
  invalidPayoutStatus: {
    type: String,
    default: 'Статусът на изплащане трябва да бъде "unpaid" или "paid"',
    trim: true,
  },
  
  // Climber messages
  climberNotFound: {
    type: String,
    default: 'Катерачът не е намерен',
    trim: true,
  },
  climberCanOnlyBookForSelf: {
    type: String,
    default: 'Катерачът може да резервира само за себе си или за свързаните деца',
    trim: true,
  },
  userMustHaveClimberRole: {
    type: String,
    default: 'Потребителят трябва да има роля катерач за създаване на резервации',
    trim: true,
  },
}, {
  timestamps: true,
});

// Ensure only one settings document exists (singleton pattern)
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const Settings = mongoose.model('Settings', settingsSchema);



