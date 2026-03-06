/**
 * getClientIP Utility
 * 
 * Standardize IP address extraction across all middleware and routes.
 * Handles Cloudflare, Nginx, and direct connections.
 */

const getClientIP = (req) => {
  let ip = req.headers['cf-connecting-ip'] ||       // Cloudflare
           req.headers['x-real-ip'] ||               // Nginx
           req.headers['x-forwarded-for'] ||         // Proxy
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           null;

  // Virgülle ayrılmış listeden ilk IP'yi al
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // IPv6 localhost'u IPv4'e çevir
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // IPv6 formatını temizle
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip || null;
};

module.exports = getClientIP;
