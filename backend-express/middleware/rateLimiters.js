/**
 * Rate Limiting Middleware
 * 
 * Katmanlı rate limiting:
 * - Genel API: 60 istek/dk
 * - Auth: 10 istek/dk
 * - Form gönderimi: 5 istek/15dk
 * - Admin API: 30 istek/dk
 * 
 * GÜVENLİK: Tüm limitler 404 döner — endpoint keşfini engeller
 */

const rateLimit = require('express-rate-limit');
const getClientIP = require('../utils/getClientIP');

const keyGenerator = (req) => getClientIP(req) || 'unknown';

// Genel API limiti — IP başına 60 istek/dakika
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  keyGenerator
});

// Auth endpointleri — çok sıkı (10 istek/dakika)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  skipSuccessfulRequests: true,
  keyGenerator
});

// Başvuru formu — form spam engelleme (5 istek/15dk per IP)
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  keyGenerator
});

// Admin API — moderate (30 istek/dakika)
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  keyGenerator
});

module.exports = { apiLimiter, authLimiter, submitLimiter, adminLimiter };
