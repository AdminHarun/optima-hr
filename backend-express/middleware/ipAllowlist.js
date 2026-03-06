/**
 * IP Allowlist Middleware
 * 
 * Admin paneline erişimi belirli IP adreslerine kısıtlar.
 * CIDR notation destekler (ör: 192.168.1.0/24).
 * OrganizationSettings tablosundan ayarları cache'leyerek okur.
 * 
 * Varsayılan: KAPALI — admin portalından açılabilir.
 */

const getClientIP = require('../utils/getClientIP');

// Cache mekanizması — her istekte DB sorgusu yapmamak için
let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

/**
 * IP'nin CIDR range'inde olup olmadığını kontrol et
 */
const ipInCIDR = (ip, cidr) => {
  if (!ip || !cidr) return false;
  if (cidr === ip) return true; // Tam eşleşme
  
  const [range, bits] = cidr.split('/');
  if (!bits) return ip === range;
  
  const bitsNum = parseInt(bits);
  if (isNaN(bitsNum) || bitsNum < 0 || bitsNum > 32) return false;
  
  const ipParts = ip.split('.');
  const rangeParts = range.split('.');
  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
  
  const mask = ~(2 ** (32 - bitsNum) - 1);
  const ipNum = ipParts.reduce((a, b) => (a << 8) + parseInt(b), 0);
  const rangeNum = rangeParts.reduce((a, b) => (a << 8) + parseInt(b), 0);
  
  return (ipNum & mask) === (rangeNum & mask);
};

/**
 * Cache'den ayarları al veya DB'den yükle
 */
const refreshCache = async () => {
  if (Date.now() < cacheExpiry && cachedSettings !== null) {
    return cachedSettings;
  }
  
  try {
    const { OrganizationSettings } = require('../models/OrganizationSettings');
    
    const enabledSetting = await OrganizationSettings.findOne({
      where: { key: 'security.ipAllowlistEnabled' }
    });
    
    if (!enabledSetting || enabledSetting.value !== true) {
      cachedSettings = { enabled: false, allowlist: [] };
      cacheExpiry = Date.now() + CACHE_TTL;
      return cachedSettings;
    }
    
    const listSetting = await OrganizationSettings.findOne({
      where: { key: 'security.ipAllowlist' }
    });
    
    cachedSettings = {
      enabled: true,
      allowlist: listSetting?.value || []
    };
    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedSettings;
  } catch (err) {
    // Model yoksa veya DB hatası — allowlist deaktif say
    if (err.name !== 'SequelizeDatabaseError') {
      console.error('IP allowlist cache error:', err.message);
    }
    cachedSettings = { enabled: false, allowlist: [] };
    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedSettings;
  }
};

/**
 * Cache'i temizle (ayar değiştiğinde çağrılır)
 */
const clearCache = () => {
  cachedSettings = null;
  cacheExpiry = 0;
};

/**
 * IP Allowlist middleware
 */
const ipAllowlistMiddleware = async (req, res, next) => {
  try {
    const settings = await refreshCache();
    
    // Allowlist deaktifse geç
    if (!settings.enabled || settings.allowlist.length === 0) {
      return next();
    }
    
    const clientIP = getClientIP(req);
    
    // IP kontrolü
    const isAllowed = settings.allowlist.some(cidr => ipInCIDR(clientIP, cidr));
    
    if (isAllowed) {
      return next();
    }
    
    console.warn(`🚫 IP Allowlist blocked: ${clientIP}, path: ${req.originalUrl}`);
    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (err) {
    // Hata durumunda erişime izin ver (fail-open — admin kilitlenmesin)
    console.error('IP allowlist middleware error:', err.message);
    return next();
  }
};

module.exports = { ipAllowlistMiddleware, clearCache, ipInCIDR };
