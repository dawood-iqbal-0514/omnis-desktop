/**
 * Authentication guard middleware
 * Checks if user is authenticated before allowing access to protected routes
 */

/**
 * Check if user has valid authentication token
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('omnis-reach-token');
  const user = localStorage.getItem('omnis-reach-user');
  
  return !!(token && user);
};

/**
 * Get protected routes that require authentication
 * @returns {string[]} Array of protected route names
 */
export const getProtectedRoutes = () => {
  return ['dashboard', 'chat', 'settings', 'platforms'];
};

/**
 * Get public routes that don't require authentication
 * @returns {string[]} Array of public route names
 */
export const getPublicRoutes = () => {
  return ['signin', 'signup', 'forgot-password', 'reset-password'];
};

/**
 * Check if a route requires authentication
 * @param {string} route - Route name to check
 * @returns {boolean} True if route requires authentication
 */
export const isProtectedRoute = (route) => {
  return getProtectedRoutes().includes(route);
};

/**
 * Check if a route is public (auth pages)
 * @param {string} route - Route name to check
 * @returns {boolean} True if route is public
 */
export const isPublicRoute = (route) => {
  return getPublicRoutes().includes(route);
};

