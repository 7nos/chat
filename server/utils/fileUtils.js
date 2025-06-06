const path = require('path');
const fs = require('fs').promises;

/**
 * Parses a server filename into its components
 * @param {string} filename - The server filename to parse
 * @returns {Object} Object containing timestamp, originalName, and extension
 */
const parseServerFilename = (filename) => {
    const match = filename.match(/^(\d+)-(.*?)(\.\w+)$/);
    if (match && match.length === 4) {
        return { timestamp: match[1], originalName: `${match[2]}${match[3]}`, extension: match[3] };
    }
    // Handle cases where the original name might not have an extension or parsing fails
    const ext = path.extname(filename);
    const base = filename.substring(0, filename.length - ext.length);
    const tsMatch = base.match(/^(\d+)-(.*)$/);
    if (tsMatch) {
        return { timestamp: tsMatch[1], originalName: `${tsMatch[2]}${ext}`, extension: ext };
    }
    // Fallback if no timestamp prefix found (less ideal)
    return { timestamp: null, originalName: filename, extension: path.extname(filename) };
};

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - The directory path to ensure exists
 */
const ensureDirExists = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch (e) {
        if (e.code === 'ENOENT') {
            await fs.mkdir(dirPath, { recursive: true });
        } else {
            throw e;
        }
    }
};

module.exports = {
    parseServerFilename,
    ensureDirExists
}; 