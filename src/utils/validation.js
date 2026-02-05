/**
 * Validation utilities for frontend
 */

/**
 * Check if a value is a valid MongoDB ObjectId
 */
export const isValidObjectId = (id) => {
    if (!id || id === 'undefined' || id === 'null' || id === '') {
        return false;
    }

    // Check if it's a 24-character hex string
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
};

/**
 * Get a safe project ID from potentially undefined values
 */
export const getSafeProjectId = (project) => {
    if (!project) return null;

    // If it's already an object with _id
    if (project._id) {
        return project._id;
    }

    // If it's a string ID
    if (typeof project === 'string' && isValidObjectId(project)) {
        return project;
    }

    // If it has an id property
    if (project.id && isValidObjectId(project.id)) {
        return project.id;
    }

    return null;
};

/**
 * Validate and return a safe project ID
 */
export const validateProjectId = (projectId) => {
    if (!projectId || projectId === 'undefined' || projectId === 'null' || projectId === '') {
        return null;
    }

    if (isValidObjectId(projectId)) {
        return projectId;
    }

    return null;
};
