/**
 * Helper function to get full name from user object
 * Supports both old format (name) and new format (firstName, middleName, lastName)
 */
export const getUserFullName = (user) => {
  if (!user) return '';
  
  // New format: firstName, middleName, lastName
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim();
  }
  
  // Old format: name (for backward compatibility)
  if (user.name) {
    return user.name;
  }
  
  // Fallback to email
  return user.email || '';
};

/**
 * Helper function to get display name (shorter version)
 */
export const getUserDisplayName = (user) => {
  if (!user) return '';
  
  // New format: firstName lastName (without middleName)
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }
  
  // Old format: name
  if (user.name) {
    return user.name;
  }
  
  // Fallback to email
  return user.email || '';
};

/**
 * Role priority order: admin > coach > climber
 */
const ROLE_PRIORITY = {
  admin: 3,
  coach: 2,
  climber: 1,
};

/**
 * Get the highest priority role for a user
 * Returns the role with highest priority (admin > coach > climber)
 */
export const getHighestPriorityRole = (user) => {
  if (!user || !user.roles || user.roles.length === 0) return null;
  
  let highestRole = null;
  let highestPriority = 0;
  
  user.roles.forEach((role) => {
    const priority = ROLE_PRIORITY[role] || 0;
    if (priority > highestPriority) {
      highestPriority = priority;
      highestRole = role;
    }
  });
  
  return highestRole;
};

/**
 * Get available role dashboards for a user based on their roles
 * Returns array of dashboard paths user can access
 */
export const getAvailableRoleDashboards = (user) => {
  if (!user) return [];
  
  // Normalize roles - ensure it's an array
  let roles = [];
  if (Array.isArray(user.roles)) {
    roles = user.roles.map(r => String(r).toLowerCase().trim()).filter(Boolean);
  } else if (user.roles) {
    // Handle case where roles might be a string or other format
    try {
      const parsed = typeof user.roles === 'string' && user.roles.startsWith('[') 
        ? JSON.parse(user.roles) 
        : [user.roles];
      if (Array.isArray(parsed)) {
        roles = parsed.map(r => String(r).toLowerCase().trim()).filter(Boolean);
      }
    } catch (e) {
      // If parsing fails, treat as single role string
      roles = [String(user.roles).toLowerCase().trim()].filter(Boolean);
    }
  }
  
  if (roles.length === 0) return [];
  
  const dashboards = [];
  
  if (roles.includes('admin')) {
    dashboards.push({ role: 'admin', path: '/admin/dashboard', label: 'Администратор' });
  }
  if (roles.includes('coach')) {
    dashboards.push({ role: 'coach', path: '/coach/dashboard', label: 'Треньор' });
  }
  if (roles.includes('instructor')) {
    dashboards.push({ role: 'instructor', path: '/coach/dashboard', label: 'Инструктор' });
  }
  if (roles.includes('climber')) {
    dashboards.push({ role: 'climber', path: '/climber/dashboard', label: 'Катерач' });
  }
  
  return dashboards;
};

