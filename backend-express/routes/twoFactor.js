/**
 * Two-Factor Authentication (2FA) Routes
 * TOTP tabanlı - Google Authenticator / Authy uyumlu
 */

const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/chatAuth');
const AdminUser = require('../models/AdminUser');

/**
 * POST /api/2fa/setup - 2FA kurulumu başlat (QR code + secret üret)
 * Requires: authenticateToken
 */
router.post('/setup', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await AdminUser.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        if (user.two_factor_enabled) {
            return res.status(400).json({
                success: false,
                error: '2FA zaten aktif. Önce devre dışı bırakın.'
            });
        }

        // TOTP secret oluştur
        const secret = speakeasy.generateSecret({
            name: `Optima HR (${user.email})`,
            issuer: 'Optima HR',
            length: 32
        });

        // Secret'ı geçici olarak kaydet (henüz doğrulanmadı)
        await user.update({ two_factor_secret: secret.base32 });

        // QR code oluştur
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            data: {
                secret: secret.base32,
                qrCode: qrCodeUrl,
                otpauthUrl: secret.otpauth_url
            }
        });
    } catch (error) {
        console.error('[2FA] Setup error:', error);
        res.status(500).json({ success: false, error: '2FA kurulumu başarısız' });
    }
});

/**
 * POST /api/2fa/verify-setup - İlk doğrulama ile 2FA aktifleştir
 * Body: { token: "123456" }
 */
router.post('/verify-setup', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Doğrulama kodu gerekli' });
        }

        const user = await AdminUser.findByPk(userId);
        if (!user || !user.two_factor_secret) {
            return res.status(400).json({ success: false, error: 'Önce 2FA kurulumunu başlatın' });
        }

        // TOTP doğrula
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token.toString(),
            window: 2 // ±2 zaman penceresi (60 saniye tolerans)
        });

        if (!verified) {
            return res.status(400).json({ success: false, error: 'Geçersiz doğrulama kodu' });
        }

        // Backup kodları oluştur (10 adet)
        const backupCodes = Array.from({ length: 10 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );

        // Backup kodlarını hashle ve kaydet
        const hashedBackupCodes = backupCodes.map(code => ({
            code: crypto.createHash('sha256').update(code).digest('hex'),
            used: false
        }));

        // 2FA aktifleştir
        await user.update({
            two_factor_enabled: true,
            two_factor_backup_codes: JSON.stringify(hashedBackupCodes)
        });

        res.json({
            success: true,
            message: '2FA başarıyla aktifleştirildi',
            backupCodes // Kullanıcıya sadece bir kez gösterilecek
        });
    } catch (error) {
        console.error('[2FA] Verify setup error:', error);
        res.status(500).json({ success: false, error: '2FA doğrulama başarısız' });
    }
});

/**
 * POST /api/2fa/verify - Login sırasında 2FA kodu doğrula
 * Body: { userId: 1, token: "123456" } veya { userId: 1, backupCode: "A1B2C3D4" }
 */
router.post('/verify', async (req, res) => {
    try {
        const { userId, token, backupCode } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Kullanıcı ID gerekli' });
        }

        const user = await AdminUser.findByPk(userId);
        if (!user || !user.two_factor_enabled) {
            return res.status(400).json({ success: false, error: '2FA aktif değil' });
        }

        // TOTP kodu ile doğrulama
        if (token) {
            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: token.toString(),
                window: 2
            });

            if (!verified) {
                return res.status(401).json({ success: false, error: 'Geçersiz doğrulama kodu' });
            }

            return res.json({ success: true, message: '2FA doğrulandı' });
        }

        // Backup kodu ile doğrulama
        if (backupCode) {
            const hashedInput = crypto.createHash('sha256').update(backupCode.toUpperCase()).digest('hex');
            const backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');

            const matchedIndex = backupCodes.findIndex(bc => bc.code === hashedInput && !bc.used);

            if (matchedIndex === -1) {
                return res.status(401).json({ success: false, error: 'Geçersiz veya kullanılmış yedek kod' });
            }

            // Kodu kullanıldı olarak işaretle
            backupCodes[matchedIndex].used = true;
            await user.update({ two_factor_backup_codes: JSON.stringify(backupCodes) });

            const remainingCodes = backupCodes.filter(bc => !bc.used).length;

            return res.json({
                success: true,
                message: '2FA yedek kod ile doğrulandı',
                remainingBackupCodes: remainingCodes
            });
        }

        return res.status(400).json({ success: false, error: 'Doğrulama kodu veya yedek kod gerekli' });
    } catch (error) {
        console.error('[2FA] Verify error:', error);
        res.status(500).json({ success: false, error: '2FA doğrulama başarısız' });
    }
});

/**
 * POST /api/2fa/disable - 2FA devre dışı bırak
 * Body: { token: "123456" }
 */
router.post('/disable', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Mevcut doğrulama kodu gerekli' });
        }

        const user = await AdminUser.findByPk(userId);
        if (!user || !user.two_factor_enabled) {
            return res.status(400).json({ success: false, error: '2FA zaten devre dışı' });
        }

        // Mevcut TOTP ile doğrula
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token.toString(),
            window: 2
        });

        if (!verified) {
            return res.status(401).json({ success: false, error: 'Geçersiz doğrulama kodu' });
        }

        // 2FA devre dışı bırak
        await user.update({
            two_factor_enabled: false,
            two_factor_secret: null,
            two_factor_backup_codes: null
        });

        res.json({ success: true, message: '2FA devre dışı bırakıldı' });
    } catch (error) {
        console.error('[2FA] Disable error:', error);
        res.status(500).json({ success: false, error: '2FA devre dışı bırakma başarısız' });
    }
});

/**
 * POST /api/2fa/backup-codes - Yeni backup codes üret
 * Body: { token: "123456" }
 */
router.post('/backup-codes', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Doğrulama kodu gerekli' });
        }

        const user = await AdminUser.findByPk(userId);
        if (!user || !user.two_factor_enabled) {
            return res.status(400).json({ success: false, error: '2FA aktif değil' });
        }

        // TOTP doğrula
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token.toString(),
            window: 2
        });

        if (!verified) {
            return res.status(401).json({ success: false, error: 'Geçersiz doğrulama kodu' });
        }

        // Yeni backup kodları oluştur
        const newBackupCodes = Array.from({ length: 10 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );

        const hashedBackupCodes = newBackupCodes.map(code => ({
            code: crypto.createHash('sha256').update(code).digest('hex'),
            used: false
        }));

        await user.update({ two_factor_backup_codes: JSON.stringify(hashedBackupCodes) });

        res.json({
            success: true,
            backupCodes: newBackupCodes,
            message: 'Yeni yedek kodlar oluşturuldu. Eski kodlar geçersiz.'
        });
    } catch (error) {
        console.error('[2FA] Backup codes error:', error);
        res.status(500).json({ success: false, error: 'Yedek kodlar oluşturulamadı' });
    }
});

/**
 * GET /api/2fa/status - Kullanıcının 2FA durumu
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await AdminUser.findByPk(userId, {
            attributes: ['id', 'two_factor_enabled']
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        let remainingBackupCodes = 0;
        if (user.two_factor_enabled) {
            try {
                const codes = JSON.parse(await AdminUser.findByPk(userId, { attributes: ['two_factor_backup_codes'] }).then(u => u.two_factor_backup_codes || '[]'));
                remainingBackupCodes = codes.filter(c => !c.used).length;
            } catch (e) { /* ignore */ }
        }

        res.json({
            success: true,
            data: {
                enabled: user.two_factor_enabled,
                remainingBackupCodes
            }
        });
    } catch (error) {
        console.error('[2FA] Status error:', error);
        res.status(500).json({ success: false, error: '2FA durumu alınamadı' });
    }
});

/**
 * POST /api/2fa/check - Login sırasında 2FA gerekli mi kontrol et
 * Body: { userId: 1 }
 */
router.post('/check', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Kullanıcı ID gerekli' });
        }

        const user = await AdminUser.findByPk(userId, {
            attributes: ['id', 'two_factor_enabled']
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        res.json({
            success: true,
            requires2FA: user.two_factor_enabled
        });
    } catch (error) {
        console.error('[2FA] Check error:', error);
        res.status(500).json({ success: false, error: '2FA kontrolü başarısız' });
    }
});

module.exports = router;
