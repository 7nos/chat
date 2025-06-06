/**
 * Sanitizes a username for use in file paths and directories
 * @param {string} username - The username to sanitize
 * @returns {string} The sanitized username
 */
const sanitizeUsername = (username) => {
    if (!username) return '';
    return username.replace(/[^a-zA-Z0-9_-]/g, '_');
};

module.exports = {
    sanitizeUsername
}; 