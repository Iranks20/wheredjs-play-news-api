/**
 * DateTime utility functions for MySQL compatibility
 */

/**
 * Convert ISO date string to MySQL datetime format
 * @param {string} isoString - ISO date string (e.g., '2025-08-13T09:41:49.024Z')
 * @returns {string|null} MySQL datetime format (e.g., '2025-08-13 09:41:49') or null
 */
function toMySQLDateTime(isoString) {
  if (!isoString) return null;
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    throw new Error(`Invalid date format: ${isoString}`);
  }
}

/**
 * Convert MySQL datetime to ISO string
 * @param {Date|string} mysqlDateTime - MySQL datetime or Date object
 * @returns {string|null} ISO string or null
 */
function fromMySQLDateTime(mysqlDateTime) {
  if (!mysqlDateTime) return null;
  
  try {
    const date = new Date(mysqlDateTime);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Validate and format date for database operations
 * @param {string} dateString - Date string to validate
 * @returns {string|null} Formatted date string or null
 */
function validateAndFormatDate(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
}

module.exports = {
  toMySQLDateTime,
  fromMySQLDateTime,
  validateAndFormatDate
};
