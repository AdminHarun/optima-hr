/**
 * SSO (Single Sign-On) Routes
 * Google OAuth2 entegrasyonu
 * 
 * Kurulum:
 * 1. Google Cloud Console'da OAuth2 credentials oluştur
 * 2. Environment variables:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_CALLBACK_URL (ör: https://api.optimahr.com/api/sso/google/callback)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const Employee = require('../models/Employee');
const { logAuditEvent } = require('../middleware/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '/api/sso/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://optimahr.com';

/**
 * GET /api/sso/google - Google OAuth2 login başlat
 */
router.get('/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(503).json({
            success: false,
            error: 'Google SSO yapılandırılmamış. GOOGLE_CLIENT_ID gerekli.'
        });
    }

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_CALLBACK_URL,
        scope: 'openid email profile',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        state: req.query.redirect || '/admin/dashboard'
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * GET /api/sso/google/callback - Google OAuth2 callback
 */
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.redirect(`${FRONTEND_URL}/admin/login?error=no_code`);
        }

        // OAuth2 code → token exchange
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('[SSO] Token exchange failed:', tokenData);
            return res.redirect(`${FRONTEND_URL}/admin/login?error=token_failed`);
        }

        // Google user info al
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const googleUser = await userInfoResponse.json();

        if (!googleUser.email) {
            return res.redirect(`${FRONTEND_URL}/admin/login?error=no_email`);
        }

        // Kullanıcıyı emaile göre bul
        let adminUser = await AdminUser.findOne({
            where: { email: googleUser.email.toLowerCase() }
        });

        if (!adminUser) {
            // Admin user yoksa, employee olarak kontrol et
            const employee = await Employee.findOne({
                where: { email: googleUser.email.toLowerCase() }
            });

            if (!employee) {
                // Audit log
                await logAuditEvent({
                    action: 'sso.login.rejected',
                    module: 'auth',
                    target_type: 'user',
                    details: {
                        email: googleUser.email,
                        reason: 'User not found in system',
                        provider: 'google'
                    },
                    ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.ip
                });

                return res.redirect(`${FRONTEND_URL}/admin/login?error=user_not_found&email=${googleUser.email}`);
            }

            // Employee var ama AdminUser yok — otomatik oluştur
            adminUser = await AdminUser.create({
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email,
                password_hash: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Random hash, SSO ile kullanılmayacak
                role: 'USER',
                site_code: employee.site_code,
                is_active: true,
                employee_id: employee.id,
                avatar_url: googleUser.picture || employee.avatar_url
            });
        }

        if (!adminUser.is_active) {
            return res.redirect(`${FRONTEND_URL}/admin/login?error=account_disabled`);
        }

        // Avatar güncelle (Google'dan)
        if (googleUser.picture && !adminUser.avatar_url) {
            await adminUser.update({ avatar_url: googleUser.picture });
        }

        // JWT token oluştur
        const jwtToken = jwt.sign({
            id: adminUser.id,
            type: adminUser.role === 'SUPER_ADMIN' ? 'admin' : 'employee',
            email: adminUser.email,
            employee_id: adminUser.employee_id,
            sso_provider: 'google'
        }, JWT_SECRET, { expiresIn: '8h' });

        // Son giriş zamanını güncelle
        await adminUser.update({ last_login: new Date() });

        // Audit log
        await logAuditEvent({
            action: 'sso.login.success',
            module: 'auth',
            target_type: 'user',
            target_id: adminUser.id,
            target_name: `${adminUser.first_name} ${adminUser.last_name}`,
            user_id: adminUser.id,
            user_email: adminUser.email,
            details: {
                provider: 'google',
                googleId: googleUser.id
            },
            ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.ip
        });

        // Frontend'e token ile redirect
        const redirectPath = state || '/admin/dashboard';
        res.redirect(`${FRONTEND_URL}${redirectPath}?sso_token=${jwtToken}&sso_user=${encodeURIComponent(JSON.stringify({
            id: adminUser.id,
            email: adminUser.email,
            firstName: adminUser.first_name,
            lastName: adminUser.last_name,
            role: adminUser.role,
            siteCode: adminUser.site_code,
            avatarUrl: adminUser.avatar_url || googleUser.picture
        }))}`);

    } catch (error) {
        console.error('[SSO] Google callback error:', error);
        res.redirect(`${FRONTEND_URL}/admin/login?error=sso_failed`);
    }
});

/**
 * GET /api/sso/providers - Aktif SSO sağlayıcılarını listele
 */
router.get('/providers', (req, res) => {
    const providers = [];

    if (GOOGLE_CLIENT_ID) {
        providers.push({
            id: 'google',
            name: 'Google',
            icon: 'google',
            enabled: true,
            loginUrl: '/api/sso/google'
        });
    }

    res.json({
        success: true,
        providers
    });
});

/**
 * POST /api/sso/validate-token - SSO token'ı doğrula
 */
router.post('/validate-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token gerekli' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await AdminUser.findByPk(decoded.id);
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, error: 'Geçersiz kullanıcı' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                siteCode: user.site_code,
                avatarUrl: user.avatar_url
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Geçersiz token' });
    }
});

module.exports = router;
