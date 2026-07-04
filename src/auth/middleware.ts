import type { User } from '../types/User';

/**
 * Utility to check user roles or custom claims.
 * Currently a placeholder, checking only that the user exists.
 */
export const checkUserPermission = (user: User | null, requiredPermission: string): boolean => {
  if (!user || !requiredPermission) return false;
  // Future logic: check claims/roles in User object
  return true;
};

