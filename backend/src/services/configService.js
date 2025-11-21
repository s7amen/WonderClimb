import { config } from '../config/env.js';

/**
 * Get booking horizon in days
 */
export const getBookingHorizonDays = () => {
  return config.bookingHorizonDays;
};

/**
 * Get cancellation window in hours
 */
export const getCancellationWindowHours = () => {
  return config.cancellationWindowHours;
};

/**
 * Check if a date is within booking horizon
 */
export const isWithinBookingHorizon = (sessionDate) => {
  const now = new Date();
  const horizonDate = new Date(now);
  horizonDate.setDate(horizonDate.getDate() + getBookingHorizonDays());

  return sessionDate <= horizonDate && sessionDate > now;
};

/**
 * Check if cancellation is allowed (within cancellation window)
 */
export const isCancellationAllowed = (sessionDate) => {
  const now = new Date();
  const cancellationDeadline = new Date(sessionDate);
  cancellationDeadline.setHours(cancellationDeadline.getHours() - getCancellationWindowHours());

  return now < cancellationDeadline;
};

