/**
 * Site Middleware - Multi-Tenant Site Isolation
 * Ensures all requests are scoped to a specific site
 */

const siteMiddleware = (req, res, next) => {
  // Get site ID from header (sent by frontend)
  const siteId = req.headers['x-site-id'];
  
  // Super admin can switch sites or view all
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    // If no site specified, allow (they can see all sites)
    req.currentSite = siteId || null;
    req.isSuperAdminViewingAll = !siteId;
    return next();
  }
  
  // Regular users must have a site
  if (!siteId) {
    return res.status(400).json({ 
      error: 'Site ID required',
      message: 'X-Site-Id header is missing'
    });
  }
  
  // TODO: Validate user has access to this site
  // For now, just set it
  req.currentSite = siteId;
  
  next();
};

module.exports = siteMiddleware;
