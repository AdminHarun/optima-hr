/**
 * Data Masking Utilities
 * 
 * KVKK uyumluluğu için hassas verileri maskeleyen helper fonksiyonlar.
 * API response'larında kullanılır.
 */

/**
 * TC Kimlik No maskeleme
 * "12345678901" → "*******8901"
 */
const maskTC = (tc) => {
  if (!tc) return null;
  const str = String(tc);
  if (str.length <= 4) return str;
  return '*'.repeat(str.length - 4) + str.slice(-4);
};

/**
 * Token maskeleme (son 6 karakter)
 * "chat_1770009775766_nd1c0hmps" → "...0hmps"
 */
const maskToken = (token) => {
  if (!token) return null;
  if (token.length <= 6) return '...';
  return '...' + token.slice(-6);
};

/**
 * IP maskeleme
 * "88.234.156.42" → "88.234.*.*"
 */
const maskIP = (ip) => {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return '***';
  return `${parts[0]}.${parts[1]}.*.*`;
};

/**
 * Sensitive alanları response objesinden temizle
 * Belirtilen alanlar response'tan kaldırılır
 */
const stripFields = (obj, fields) => {
  if (!obj) return obj;
  const cleaned = { ...obj };
  fields.forEach(field => {
    delete cleaned[field];
  });
  return cleaned;
};

/**
 * Sequelize model instance'ını güvenli JSON'a dönüştür
 * Belirtilen alanları exclude eder
 */
const safeJSON = (instance, excludeFields = []) => {
  if (!instance) return null;
  const json = instance.toJSON ? instance.toJSON() : { ...instance };
  excludeFields.forEach(field => {
    delete json[field];
  });
  return json;
};

// Varsayılan hassas alanlar — hiçbir response'ta olmamalı
const SENSITIVE_FIELDS = [
  'chat_token', 'chatToken',
  'session_token', 'sessionToken',
  'password_hash', 'passwordHash',
  'security_answer_hash', 'securityAnswerHash'
];

// Liste endpoint'lerinde ek olarak kaldırılacak alanlar
const LIST_EXCLUDED_FIELDS = [
  ...SENSITIVE_FIELDS,
  'profile_created_ip', 'profileCreatedIp',
  'profile_created_location', 'profileCreatedLocation',
  'device_info', 'deviceInfo',
  'submitted_ip', 'submittedIp',
  'vpn_score', 'vpnScore',
  'is_vpn', 'isVpn'
];

module.exports = {
  maskTC,
  maskToken,
  maskIP,
  stripFields,
  safeJSON,
  SENSITIVE_FIELDS,
  LIST_EXCLUDED_FIELDS
};
