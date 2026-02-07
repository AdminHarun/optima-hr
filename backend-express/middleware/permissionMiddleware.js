/**
 * Permission Middleware - Check user permissions
 * Usage: router.post('/endpoint', requirePermission('module', 'action'), handler)
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

/**
 * Check if user has a specific permission
 */
const requirePermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all checks
      if (req.user && req.user.role === 'SUPER_ADMIN') {
        return next();
      }
      
      const userEmail = req.user?.email;
      const siteId = req.currentSite;
      const permissionKey = `${module}:${action}`;
      
      if (!userEmail) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!siteId) {
        return res.status(400).json({ error: 'Site context required' });
      }
      
      // Check if user has this permission for this site
      const result = await pool.query(
        `SELECT enabled FROM user_permissions 
         WHERE user_email = $1 
         AND site_id = $2 
         AND permission_key = $3
         AND enabled = true`,
        [userEmail, siteId, permissionKey]
      );
      
      if (result.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Permission denied',
          message: `You don't have permission: ${permissionKey}`,
          required: permissionKey
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Get all permissions for a user on a specific site
 */
async function getUserPermissions(userEmail, siteId) {
  const result = await pool.query(
    `SELECT permission_key 
     FROM user_permissions 
     WHERE user_email = $1 
     AND site_id = $2 
     AND enabled = true`,
    [userEmail, siteId]
  );
  
  return result.rows.map(row => row.permission_key);
}

module.exports = {
  requirePermission,
  getUserPermissions
};
