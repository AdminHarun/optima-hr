/**
 * Secure Token Generator
 * 
 * crypto.randomBytes() kullanarak kriptografik güvenli token üretir.
 * Math.random() KULLANMAZ — tahmin edilemez token'lar üretir.
 */

const crypto = require('crypto');

/**
 * Güvenli token oluştur
 * @param {string} prefix - Token öneki (chat, session, vb.)
 * @param {number} bytes - Rastgele byte sayısı (varsayılan 32 = 64 hex karakter)
 * @returns {string} Güvenli token
 */
const generateSecureToken = (prefix = '', bytes = 32) => {
  const randomPart = crypto.randomBytes(bytes).toString('hex');
  return prefix ? `${prefix}_${randomPart}` : randomPart;
};

/**
 * Güvenli invitation token oluştur (32 karakter alfanumerik)
 * @returns {string} 32 karakterlik güvenli token
 */
const generateInvitationToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(32);
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
};

module.exports = { generateSecureToken, generateInvitationToken };
