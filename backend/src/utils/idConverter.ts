/**
 * ID Conversion Utilities
 * Provides type-safe conversion between number and UUID string IDs
 */

/**
 * Convert any ID type to UUID string
 * Handles both number and string inputs
 */
export const toUUID = (id: string | number): string => {
  return typeof id === 'number' ? String(id) : id;
};

/**
 * Ensure ID is a UUID string and not undefined
 * Throws error if ID is missing
 */
export const ensureUUID = (id: string | number | undefined): string => {
  if (!id) {
    throw new Error('ID is required');
  }
  return typeof id === 'number' ? String(id) : id;
};

/**
 * Validate and ensure ID from request parameters
 * Returns typed string or throws validation error
 */
export const validateId = (id: string | undefined, paramName: string): string => {
  if (!id || id.trim().length === 0) {
    throw new Error(`${paramName} is required`);
  }
  return id;
};
