const QRCode = require('qrcode');

/**
 * Generates a QR Code as a Data URL from a text string.
 * @param {string} text - The content to encode in the QR Code.
 * @returns {Promise<string>} The QR Code image as a Data URL (base64).
 */
const generateQRCode = async (text) => {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR Code', err);
    throw err;
  }
};

module.exports = { generateQRCode };
