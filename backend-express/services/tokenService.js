/**
 * Token Service - Encoded invitation tokens for applications
 * Tokens are Base64 encoded and contain site information
 */

const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

class TokenService {
  /**
   * Generate a new invitation token
   * @param {string} siteCode - Site code (FXB, MTD, ZBH)
   * @param {object} options - Token options (title, maxUses, expiresAt)
   * @returns {string} Encoded token
   */
  static generateToken(siteCode, options = {}) {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    
    const tokenData = {
      site: siteCode,
      id: uniqueId,
      ts: timestamp
    };
    
    // Encode to Base64
    const encoded = Buffer.from(JSON.stringify(tokenData)).toString('base64url');
    
    return encoded;
  }
  
  /**
   * Decode and validate a token
   * @param {string} token - Encoded token
   * @returns {object} Decoded token data
   */
  static decodeToken(token) {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const data = JSON.parse(decoded);
      
      if (!data.site || !data.id) {
        throw new Error('Invalid token format');
      }
      
      return data;
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }
  
  /**
   * Create invitation link in database
   * @param {string} siteId - Site ID
   * @param {object} options - Link options
   * @returns {object} Created invitation link
   */
  static async createInvitationLink(siteId, options = {}) {
    const {
      title = 'Başvuru Linki',
      maxUses = null,
      expiresAt = null,
      createdBy = null
    } = options;
    
    // Get site code
    const siteResult = await pool.query(
      'SELECT code FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (siteResult.rows.length === 0) {
      throw new Error('Site not found');
    }
    
    const siteCode = siteResult.rows[0].code;
    
    // Generate token
    const token = this.generateToken(siteCode);
    
    // Save to database
    const result = await pool.query(
      `INSERT INTO invitation_links 
       (site_id, token, title, max_uses, current_uses, expires_at, created_by, is_active)
       VALUES ($1, $2, $3, $4, 0, $5, $6, true)
       RETURNING *`,
      [siteId, token, title, maxUses, expiresAt, createdBy]
    );
    
    const link = result.rows[0];
    
    return {
      ...link,
      url: `${process.env.APPLICATION_URL || 'https://basvuru.optimahr.com'}/${token}`
    };
  }
  
  /**
   * Validate token and get invitation link details
   * @param {string} token - Token to validate
   * @returns {object} Invitation link details
   */
  static async validateToken(token) {
    // Decode token
    const decoded = this.decodeToken(token);
    
    // Get from database
    const result = await pool.query(
      `SELECT il.*, s.code as site_code, s.name as site_name 
       FROM invitation_links il
       JOIN sites s ON il.site_id = s.id
       WHERE il.token = $1 AND il.is_active = true`,
      [token]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid or inactive token');
    }
    
    const link = result.rows[0];
    
    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new Error('Token has expired');
    }
    
    // Check usage limit
    if (link.max_uses && link.current_uses >= link.max_uses) {
      throw new Error('Token usage limit reached');
    }
    
    return link;
  }
  
  /**
   * Increment token usage counter
   * @param {string} token - Token
   */
  static async incrementTokenUsage(token) {
    await pool.query(
      `UPDATE invitation_links 
       SET current_uses = current_uses + 1 
       WHERE token = $1`,
      [token]
    );
  }
  
  /**
   * Get site ID from token
   * @param {string} token - Token
   * @returns {number} Site ID
   */
  static async getSiteIdFromToken(token) {
    const link = await this.validateToken(token);
    return link.site_id;
  }
}

module.exports = TokenService;
