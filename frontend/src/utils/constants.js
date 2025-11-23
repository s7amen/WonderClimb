// Color constants
export const COLORS = {
  PRIMARY: '#ff6900',
  PRIMARY_DARK: '#f54900',
  SUCCESS: '#00c950',
  ERROR: '#dc2626',
  TEXT_PRIMARY: '#0f172b',
  TEXT_SECONDARY: '#64748b',
  BORDER: '#cad5e2',
  BACKGROUND_SELECTED: '#ffe5d4',
  BACKGROUND_RESERVATION: 'bg-orange-50',
};

// Reservation color classes for climber badges
export const RESERVATION_COLOR_CLASSES = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
];

// Target group configurations
export const TARGET_GROUP_CONFIG = {
  beginner: { label: 'Начинаещи', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  experienced: { label: 'Деца с опит', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  advanced: { label: 'Напреднали', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

// Screen breakpoints
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
};

// Booking horizon (days)
export const BOOKING_HORIZON_DAYS = 30;

// Default session duration (minutes)
export const DEFAULT_SESSION_DURATION = 60;

// Helper function to get reservation color by index
export const getReservationColor = (index) => {
  return RESERVATION_COLOR_CLASSES[index % RESERVATION_COLOR_CLASSES.length];
};

// Helper function to get target group config
export const getTargetGroupConfig = (group) => {
  return TARGET_GROUP_CONFIG[group] || { label: group, bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
};

