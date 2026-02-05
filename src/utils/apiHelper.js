/**
 * API Helper Utility
 * Provides dynamic API endpoint resolution based on user role
 */

export const getApiPrefix = (user) => {
    return user?.role === 'admin' ? '/admin' : '/site';
};

export const getEndpoint = (user, endpoint) => {
    const prefix = getApiPrefix(user);
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${prefix}/${cleanEndpoint}`;
};
