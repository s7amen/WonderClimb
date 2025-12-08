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
 * Role priority order: admin > coach > instructor > climber
 */
const ROLE_PRIORITY = {
  admin: 4,
  coach: 3,
  instructor: 2,
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

  // Check each role and add dashboard if user has that role
  // Use Set for faster lookup and ensure we check all roles
  const rolesSet = new Set(roles);

  if (rolesSet.has('admin')) {
    dashboards.push({ role: 'admin', path: '/dashboard/admin', label: 'Администратор' });
  }
  if (rolesSet.has('coach')) {
    dashboards.push({ role: 'coach', path: '/dashboard/coach', label: 'Треньор' });
  }
  if (rolesSet.has('instructor')) {
    dashboards.push({ role: 'instructor', path: '/dashboard/instructor', label: 'Инструктор' });
  }
  if (rolesSet.has('climber')) {
    dashboards.push({ role: 'climber', path: '/dashboard/climber', label: 'Катерач' });
  }

  return dashboards;
};

/**
 * Get the active role based on current pathname
 * Returns the role that matches the current route, or highest priority role if no match
 */
export const getActiveRole = (user, pathname) => {
  if (!user || !user.roles || user.roles.length === 0) return null;

  // Normalize roles
  let roles = [];
  if (Array.isArray(user.roles)) {
    roles = user.roles.map(r => String(r).toLowerCase().trim()).filter(Boolean);
  } else if (user.roles) {
    try {
      const parsed = typeof user.roles === 'string' && user.roles.startsWith('[')
        ? JSON.parse(user.roles)
        : [user.roles];
      if (Array.isArray(parsed)) {
        roles = parsed.map(r => String(r).toLowerCase().trim()).filter(Boolean);
      }
    } catch (e) {
      roles = [String(user.roles).toLowerCase().trim()].filter(Boolean);
    }
  }

  // Check pathname to determine active role
  // Dashboard paths
  if (pathname.startsWith('/dashboard/admin')) return 'admin';
  if (pathname.startsWith('/dashboard/coach')) return 'coach';
  if (pathname.startsWith('/dashboard/instructor')) return 'instructor';
  if (pathname.startsWith('/dashboard/climber')) return 'climber';

  // Feature paths - return highest priority role
  // Since features are shared, we default to the user's highest role
  return getHighestPriorityRole(user);
};

/**
 * Get dashboard path for a role
 */
export const getDashboardPathForRole = (role) => {
  const roleMap = {
    admin: '/dashboard/admin',
    coach: '/dashboard/coach',
    instructor: '/dashboard/instructor',
    climber: '/dashboard/climber',
  };
  return roleMap[role] || '/';
};

/**
 * Get role label in Bulgarian
 */
export const getRoleLabel = (role) => {
  const labelMap = {
    admin: 'Администратор',
    coach: 'Треньор',
    instructor: 'Инструктор',
    climber: 'Катерач',
  };
  return labelMap[role] || role;
};

