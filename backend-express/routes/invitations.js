const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { InvitationLink, ApplicantProfile, JobApplication } = require('../models/associations');

// IP adresi alma helper
const getClientIP = (req) => {
  // Proxy arkasından gerçek IP'yi al
  let ip = req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.headers['cf-connecting-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
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

// Tüm invitation linklerini getir (Admin paneli için)
router.get('/', async (req, res) => {
  console.log('📥 GET /api/invitations - Request received');
  try {
    const siteCode = req.headers['x-site-id'];
    console.log('🔍 Fetching invitations from database... site_code:', siteCode);

    const whereClause = {};
    if (siteCode) {
      whereClause.site_code = siteCode;
    }

    let invitations = [];
    let includeProfiles = true;

    // Önce association'larla dene, başarısız olursa basit sorgu yap
    try {
      invitations = await InvitationLink.findAll({
        where: whereClause,
        include: [
          {
            model: ApplicantProfile,
            as: 'profiles',
            required: false,
            include: [
              {
                model: JobApplication,
                as: 'applications',
                required: false
              }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (includeError) {
      console.warn('⚠️ Association query failed, falling back to simple query:', includeError.message);
      includeProfiles = false;
      invitations = await InvitationLink.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
    }

    console.log(`✅ Found ${invitations.length} invitations (with profiles: ${includeProfiles})`);

    // LocalStorage formatına uyumlu dönüştür
    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      token: inv.token,
      status: inv.status,
      createdAt: inv.created_at,
      clickedAt: inv.first_clicked_at || inv.clickedAt,
      usedAt: inv.form_completed_at || inv.usedAt,
      ipAddress: inv.first_clicked_ip ? inv.first_clicked_ip.toString() : inv.ipAddress,
      applicantName: inv.applicant_name,
      applicantPhone: inv.applicant_phone,

      // Ek bilgiler
      first_accessed_ip: inv.first_clicked_ip ? inv.first_clicked_ip.toString() : null,
      form_submitted_at: inv.form_completed_at,
      form_submitted_ip: inv.form_completed_ip ? inv.form_completed_ip.toString() : null,
      click_count: inv.click_count,

      // Profil ve başvuru bilgileri (varsa)
      profiles: includeProfiles ? (inv.profiles || []) : [],
      applications: includeProfiles ? (inv.profiles?.flatMap(p => p.applications) || []) : []
    }));

    console.log('📤 Sending response:', JSON.stringify(formattedInvitations).substring(0, 100));
    res.json(formattedInvitations);
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ Error fetching invitations:', error);
    res.status(500).json({ error: 'Davet linkleri alınamadı', details: error.message });
  }
});

// Yeni invitation link oluştur
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-posta adresi gerekli' });
    }

    const siteCode = req.headers['x-site-id'] || null;

    // Token oluştur (Frontend ile aynı format)
    const generateRandomToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };

    // E-posta duplicate kontrolü (site bazlı)
    const duplicateWhere = {
      email: email.toLowerCase(),
      status: { [Op.in]: ['active', 'clicked'] }
    };
    if (siteCode) {
      duplicateWhere.site_code = siteCode;
    }
    const existingLink = await InvitationLink.findOne({
      where: duplicateWhere
    });

    if (existingLink) {
      return res.status(409).json({
        error: 'Bu e-posta adresine aktif bir link zaten mevcut',
        existing: {
          id: existingLink.id,
          email: existingLink.email,
          status: existingLink.status,
          createdAt: existingLink.created_at,
          usedAt: existingLink.form_completed_at
        }
      });
    }

    const token = generateRandomToken();
    const clientIP = getClientIP(req);

    const newInvitation = await InvitationLink.create({
      email: email.toLowerCase(),
      token: token,
      status: 'active',
      site_code: siteCode,
      created_by: req.user?.id || null, // Auth sistemi varsa
      // LocalStorage uyumluluğu için
      clickedAt: null,
      usedAt: null,
      ipAddress: null
    });

    // LocalStorage formatında döndür
    const response = {
      id: newInvitation.id,
      email: newInvitation.email,
      token: newInvitation.token,
      status: newInvitation.status,
      createdAt: newInvitation.created_at,
      clickedAt: null,
      usedAt: null,
      ipAddress: null,
      applicantName: null,
      applicantPhone: null,

      // Link URL'i
      link: `${req.get('origin') || 'http://localhost:3000'}/apply/${token}`
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Davet linki oluşturulamadı' });
  }
});

// Invitation link sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invitation = await InvitationLink.findByPk(id);
    if (!invitation) {
      return res.status(404).json({ error: 'Davet linki bulunamadı' });
    }

    await invitation.destroy();
    res.json({ message: 'Davet linki silindi' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    res.status(500).json({ error: 'Davet linki silinemedi' });
  }
});

// Token ile invitation link doğrula ve IP kaydet (Public endpoint)
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const clientIP = getClientIP(req);
    const { real_ip } = req.query; // Frontend'den gelen gerçek IP

    const invitation = await InvitationLink.findOne({
      where: { token }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }

    if (invitation.status === 'used') {
      return res.status(410).json({
        error: 'Bu davet linki daha önce kullanılmış',
        usedAt: invitation.form_completed_at,
        applicantName: invitation.applicant_name
      });
    }

    // Gerçek IP'yi kullan, yoksa clientIP
    const realIP = real_ip || clientIP;
    console.log('🌐 Backend IP bilgileri:', {
      clientIP,
      real_ip,
      finalIP: realIP
    });

    // İlk tıklama ise IP kaydet
    if (!invitation.first_clicked_at) {
      console.log('🔄 İlk tıklama kaydediliyor, IP:', realIP);
      await invitation.update({
        first_clicked_at: new Date(),
        first_clicked_ip: realIP,
        click_count: 1,
        status: 'clicked',
        // LocalStorage uyumluluğu
        clickedAt: new Date(),
        ipAddress: realIP
      });
    } else {
      // Tıklama sayısını artır
      await invitation.update({
        click_count: invitation.click_count + 1
      });
    }

    res.json({
      valid: true,
      email: invitation.email,
      token: invitation.token,
      status: invitation.status,
      firstClick: !invitation.first_clicked_at
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    res.status(500).json({ error: 'Token doğrulanamadı', details: error.message });
  }
});

// LocalStorage verilerini DB'ye sync et (Migration için)
router.post('/sync', async (req, res) => {
  try {
    const { invitations } = req.body;

    if (!Array.isArray(invitations)) {
      return res.status(400).json({ error: 'Geçersiz veri formatı' });
    }

    const synced = [];

    for (const inv of invitations) {
      try {
        // Mevcut kaydı kontrol et
        const existing = await InvitationLink.findOne({
          where: { token: inv.token }
        });

        if (!existing) {
          // Yeni kayıt oluştur
          const newInv = await InvitationLink.create({
            email: inv.email,
            token: inv.token,
            status: inv.status,
            created_at: inv.createdAt ? new Date(inv.createdAt) : new Date(),
            first_clicked_at: inv.clickedAt ? new Date(inv.clickedAt) : null,
            first_clicked_ip: inv.ipAddress || null,
            form_completed_at: inv.usedAt ? new Date(inv.usedAt) : null,
            form_completed_ip: inv.form_submitted_ip || null,
            applicant_name: inv.applicantName || null,
            applicant_phone: inv.applicantPhone || null,
            click_count: inv.clickedAt ? 1 : 0,
            // LocalStorage uyumluluğu
            clickedAt: inv.clickedAt ? new Date(inv.clickedAt) : null,
            usedAt: inv.usedAt ? new Date(inv.usedAt) : null,
            ipAddress: inv.ipAddress || null
          });
          synced.push(newInv.id);
        }
      } catch (syncError) {
        console.error('Sync error for invitation:', inv.token, syncError);
      }
    }

    res.json({
      message: `${synced.length} davet linki senkronize edildi`,
      synced: synced
    });
  } catch (error) {
    console.error('Error syncing invitations:', error);
    res.status(500).json({ error: 'Senkronizasyon başarısız' });
  }
});

// Davet linkini kullanılmış olarak işaretle
router.post('/mark-used/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { used_at } = req.body;
    const clientIP = getClientIP(req);

    console.log('🔄 Link kullanılmış olarak işaretleniyor:', token);
    console.log('🌐 Client IP:', clientIP);

    // Token'ı bul
    const invitation = await InvitationLink.findOne({
      where: { token }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Davet linki bulunamadı' });
    }

    // Zaten kullanılmışsa kontrol et
    if (invitation.status === 'used') {
      return res.status(400).json({
        error: 'Bu davet linki zaten kullanılmış',
        status: 'already_used',
        used_at: invitation.used_at
      });
    }

    // Link'i kullanılmış olarak işaretle
    const updatedInvitation = await invitation.update({
      status: 'used',
      used_at: used_at ? new Date(used_at) : new Date(),
      form_completed_at: new Date(),
      form_completed_ip: clientIP,
      updated_at: new Date()
    });

    console.log('✅ Link başarıyla kullanılmış olarak işaretlendi');

    res.json({
      message: 'Davet linki başarıyla kullanılmış olarak işaretlendi',
      token: token,
      status: 'used',
      used_at: updatedInvitation.used_at,
      form_completed_at: updatedInvitation.form_completed_at,
      form_completed_ip: updatedInvitation.form_completed_ip
    });

  } catch (error) {
    console.error('Error marking invitation as used:', error);
    res.status(500).json({
      error: 'Link işaretlenirken hata oluştu',
      details: error.message
    });
  }
});

module.exports = router;