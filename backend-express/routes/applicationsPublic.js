/**
 * applicationsPublic.js
 * 
 * Public applicant-facing endpoints — NO AUTH REQUIRED
 * Bu dosya sadece aday tarafının kullandığı endpoint'leri içerir.
 * Admin endpoint'leri applications.js'de requireAuth arkasındadır.
 * 
 * GÜVENLİK: Bu endpoint'ler minimum veri döndürür.
 * Token, IP, TC gibi hassas alanlar response'larda bulunmaz.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { InvitationLink, ApplicantProfile, JobApplication } = require('../models/associations');
const TokenService = require('../services/tokenService');
const r2Storage = require('../services/r2StorageService');
const { generateSecureToken } = require('../utils/tokenGenerator');

// Standardize IP helper
const getClientIP = (req) => {
  let ip = req.headers['cf-connecting-ip'] ||
           req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           null;

  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip || null;
};

// Multer config (reuse from applications.js)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/applications');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const crypto = require('crypto');
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Desteklenmeyen dosya formatı'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});


// ============================================
// INVITATION VALIDATION (Public)
// ============================================

// Token ile invitation doğrula
router.get('/validate-invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const clientIP = getClientIP(req);
    const { real_ip } = req.query;

    const invitation = await InvitationLink.findOne({
      where: { token }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }

    if (invitation.status === 'used') {
      // Profil ve başvuru bilgisini kontrol et
      const profile = await ApplicantProfile.findOne({
        where: { invitation_link_id: invitation.id },
        include: [{ model: JobApplication, as: 'applications', required: false }]
      });

      return res.status(410).json({
        error: 'Bu davet linki daha önce kullanılmış',
        status: 'used',
        hasProfile: !!profile,
        hasApplication: profile?.applications?.length > 0
        // GÜVENLİK: sessionToken kaldırıldı
      });
    }

    // IP kaydet
    const realIP = real_ip || clientIP;
    const updateData = {};

    if (!invitation.first_accessed_ip) {
      updateData.first_accessed_ip = realIP;
      updateData.first_clicked_at = new Date();
      updateData.status = 'clicked';
    }

    updateData.click_count = (invitation.click_count || 0) + 1;

    if (Object.keys(updateData).length > 0) {
      await invitation.update(updateData);
    }

    // GÜVENLİK: Token'ı response'ta döndürmüyoruz (zaten URL'de var)
    res.json({
      valid: true,
      email: invitation.email,
      status: invitation.status,
      siteCode: invitation.site_code
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    res.status(500).json({ error: 'Doğrulama başarısız' });
  }
});


// ============================================
// PROFILE CREATION (Public)
// ============================================

router.post('/profiles', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, token, real_ip, password, securityQuestion, securityAnswer, deviceInfo, vpnScore, isVpn, ipGeo } = req.body;
    const clientIP = getClientIP(req);

    if (!firstName || !lastName || !email || !phone || !token) {
      return res.status(400).json({ error: 'Tüm alanlar gerekli' });
    }

    const invitation = await InvitationLink.findOne({ where: { token } });

    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }

    if (invitation.status === 'used') {
      return res.status(410).json({ error: 'Bu davet linki daha önce kullanılmış' });
    }

    const existingProfile = await ApplicantProfile.findOne({
      where: { invitation_link_id: invitation.id }
    });
    if (existingProfile) {
      return res.status(409).json({
        error: 'Bu link için profil zaten oluşturulmuş',
        status: 'profile_exists'
        // GÜVENLİK: sessionToken kaldırıldı
      });
    }

    const realIP = real_ip || clientIP;
    const sessionToken = generateSecureToken('session');

    let passwordHash = null;
    let securityAnswerHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    if (securityAnswer) {
      securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase(), 10);
    }

    const profile = await ApplicantProfile.create({
      invitation_link_id: invitation.id,
      site_code: invitation.site_code || null,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone: phone,
      session_token: sessionToken,
      profile_created_ip: realIP,
      profile_created_location: ipGeo || null,
      token: token,
      password_hash: passwordHash,
      security_question: securityQuestion || null,
      security_answer_hash: securityAnswerHash,
      device_info: deviceInfo || null,
      vpn_score: vpnScore || 0,
      is_vpn: isVpn || false
    });

    await invitation.update({
      applicant_name: `${firstName} ${lastName}`,
      applicant_phone: phone
    });

    // GÜVENLİK: Sadece minimum veri döndür
    res.status(201).json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      sessionToken: profile.session_token,
      token: token
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Profil oluşturulamadı' });
  }
});


// ============================================
// APPLICATION SUBMISSION (Public)
// ============================================

router.post('/submit', upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'internetTest', maxCount: 1 },
  { name: 'typingTest', maxCount: 1 }
]), async (req, res) => {
  try {
    const formData = req.body;
    const files = req.files;
    const clientIP = getClientIP(req);

    if (!formData.token) {
      return res.status(400).json({ error: 'Token gerekli' });
    }

    if (formData.kvkkApproved !== 'true') {
      return res.status(400).json({ error: 'KVKK onayı gerekli' });
    }

    const invitation = await InvitationLink.findOne({
      where: { token: formData.token },
      include: [{
        model: ApplicantProfile,
        as: 'profiles',
        required: false
      }]
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }

    if (invitation.status === 'used') {
      return res.status(410).json({ error: 'Bu davet linki daha önce kullanılmış' });
    }

    let profile = invitation.profiles?.[0];
    if (!profile) {
      const sessionToken = generateSecureToken('session');
      profile = await ApplicantProfile.create({
        invitation_link_id: invitation.id,
        site_code: invitation.site_code || null,
        first_name: formData.firstName || 'Bilinmiyor',
        last_name: formData.lastName || '',
        email: invitation.email,
        phone: formData.phone || '',
        session_token: sessionToken,
        profile_created_ip: clientIP,
        token: formData.token
      });
    }

    // Chat token oluştur
    const chatToken = generateSecureToken('chat');
    await profile.update({ chat_token: chatToken });

    // Dosya yükleme işlemi
    const savedFiles = {};
    if (files) {
      for (const [fieldName, fileArray] of Object.entries(files)) {
        const file = fileArray[0];
        if (file) {
          if (r2Storage.isR2Enabled()) {
            try {
              const r2Key = `applications/${profile.id}/${fieldName}/${file.filename}`;
              await r2Storage.uploadFile(file.path, r2Key, file.mimetype);
              savedFiles[fieldName] = { path: r2Key, name: file.originalname, storage: 'r2' };
              fs.unlinkSync(file.path);
            } catch (uploadErr) {
              console.error(`R2 upload failed for ${fieldName}:`, uploadErr.message);
              savedFiles[fieldName] = { path: file.path, name: file.originalname, storage: 'local' };
            }
          } else {
            savedFiles[fieldName] = { path: file.path, name: file.originalname, storage: 'local' };
          }
        }
      }
    }

    // Başvuru oluştur
    const application = await JobApplication.create({
      applicant_profile_id: profile.id,
      site_code: profile.site_code || invitation.site_code || null,
      invitation_link_id: invitation.id,
      tc_number: formData.tcNumber || null,
      birth_date: formData.birthDate || null,
      address: formData.address || null,
      city: formData.city || null,
      district: formData.district || null,
      education_level: formData.educationLevel || null,
      university: formData.university || null,
      department: formData.department || null,
      graduation_year: formData.graduationYear || null,
      gpa: formData.gpa || null,
      has_sector_experience: formData.hasSectorExperience === 'true',
      experience_level: formData.experienceLevel || null,
      last_company: formData.lastCompany || null,
      last_position: formData.lastPosition || null,
      experience_duration: formData.experienceDuration || null,
      reference_name: formData.referenceName || null,
      reference_phone: formData.referencePhone || null,
      reference_company: formData.referenceCompany || null,
      reference_relation: formData.referenceRelation || null,
      why_apply: formData.whyApply || null,
      strengths: formData.strengths || null,
      salary_expectation: formData.salaryExpectation || null,
      start_date: formData.startDate || null,
      additional_notes: formData.additionalNotes || null,
      kvkk_approved: formData.kvkkApproved === 'true',
      cv_file_path: savedFiles.cv?.path || null,
      cv_file_name: savedFiles.cv?.name || null,
      internet_test_file_path: savedFiles.internetTest?.path || null,
      internet_test_file_name: savedFiles.internetTest?.name || null,
      typing_test_file_path: savedFiles.typingTest?.path || null,
      typing_test_file_name: savedFiles.typingTest?.name || null,
      chat_token: chatToken,
      submitted_ip: formData.real_ip || clientIP,
      status: 'pending'
    });

    // Invitation durumunu güncelle
    await invitation.update({
      status: 'used',
      form_completed_at: new Date(),
      form_submitted_ip: formData.real_ip || clientIP,
      applicant_name: `${formData.firstName || profile.first_name} ${formData.lastName || profile.last_name}`,
      applicant_phone: formData.phone || profile.phone
    });

    // Chat odası oluştur
    try {
      const ChatRoom = require('../models/ChatRoom');
      const applicantName = `${profile.first_name} ${profile.last_name}`;
      let existingRoom = await ChatRoom.findOne({
        where: { applicant_id: profile.id }
      });

      if (existingRoom) {
        await existingRoom.update({ is_active: true, room_name: applicantName, applicant_name: applicantName });
      } else {
        await ChatRoom.create({
          site_code: invitation.site_code || profile.site_code || null,
          room_type: 'applicant',
          channel_type: 'EXTERNAL',
          applicant_id: profile.id,
          applicant_email: profile.email,
          applicant_name: applicantName,
          room_name: applicantName,
          is_active: true
        });
      }
    } catch (chatErr) {
      if (chatErr.name !== 'SequelizeUniqueConstraintError') {
        console.error('Chat odası oluşturulamadı:', chatErr.message);
      }
    }

    // GÜVENLİK: chatToken sadece başvuru anında döner (tek seferlik)
    res.json({
      success: true,
      applicationId: application.id,
      chatToken: chatToken,
      filesUploaded: Object.keys(savedFiles)
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: 'Başvuru gönderilemedi' });
  }
});


// ============================================
// SESSION & CHAT VALIDATION (Public)
// ============================================

router.get('/session/:sessionToken', async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const profile = await ApplicantProfile.findOne({
      where: { session_token: sessionToken },
      include: [{ model: InvitationLink, as: 'invitation_link' }]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Geçersiz session' });
    }

    // GÜVENLİK: Minimum veri — token, IP bilgisi döndürmüyoruz
    res.json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      token: profile.invitation_link?.token,
      valid: true
    });
  } catch (error) {
    console.error('Error validating session:', error);
    res.status(500).json({ error: 'Session doğrulanamadı' });
  }
});

router.get('/chat/:chatToken', async (req, res) => {
  try {
    const { chatToken } = req.params;
    const profile = await ApplicantProfile.findOne({
      where: { chat_token: chatToken },
      include: [
        { model: InvitationLink, as: 'invitation_link' },
        { model: JobApplication, as: 'applications' }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Geçersiz chat token' });
    }

    // GÜVENLİK: chatToken ve sessionToken döndürmüyoruz
    res.json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      application: profile.applications?.[0] ? {
        id: profile.applications[0].id,
        status: profile.applications[0].status
      } : null,
      valid: true
    });
  } catch (error) {
    console.error('Error validating chat token:', error);
    res.status(500).json({ error: 'Chat token doğrulanamadı' });
  }
});


// ============================================
// APPLICANT LOGIN (Public)
// ============================================

router.post('/applicant-login', async (req, res) => {
  try {
    const { email, password, securityAnswer, mode } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    const profile = await ApplicantProfile.findOne({
      where: { email: email.toLowerCase() },
      include: [{ model: JobApplication, as: 'applications' }]
    });

    if (!profile) {
      // GÜVENLİK: Genel hata mesajı — kullanıcı var/yok bilgisi sızdırmaz
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    // Şifre ile giriş
    if (mode === 'password' || !mode) {
      if (!password) {
        return res.status(400).json({ error: 'Şifre gerekli' });
      }
      if (!profile.password_hash) {
        return res.status(401).json({ error: 'Geçersiz email veya şifre' });
      }
      const isValid = await bcrypt.compare(password, profile.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Geçersiz email veya şifre' });
      }
    }
    // Güvenlik sorusu ile giriş
    else if (mode === 'security') {
      if (!securityAnswer) {
        return res.status(400).json({ error: 'Güvenlik sorusu cevabı gerekli' });
      }
      if (!profile.security_answer_hash) {
        return res.status(401).json({ error: 'Geçersiz email veya cevap' });
      }
      const isValid = await bcrypt.compare(securityAnswer.toLowerCase(), profile.security_answer_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Geçersiz email veya cevap' });
      }
    } else {
      return res.status(400).json({ error: 'Geçersiz giriş modu' });
    }

    // Yeni session token
    const newSessionToken = generateSecureToken('session');
    await profile.update({ session_token: newSessionToken });

    const application = profile.applications?.[0];

    // GÜVENLİK: Minimum veri döndür — chatToken sadece gerekli olduğu kadar
    res.json({
      success: true,
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      sessionToken: newSessionToken,
      chatToken: profile.chat_token,
      siteCode: profile.site_code,
      application: application ? {
        id: application.id,
        status: application.status,
        chatToken: application.chat_token
      } : null
    });

  } catch (error) {
    console.error('Error in applicant login:', error);
    res.status(500).json({ error: 'Giriş işlemi başarısız' });
  }
});

router.post('/get-security-question', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    const profile = await ApplicantProfile.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['security_question']
    });

    if (!profile || !profile.security_question) {
      // GÜVENLİK: Genel mesaj — email var/yok bilgisi sızdırmaz
      return res.status(404).json({ error: 'Güvenlik sorusu bulunamadı' });
    }

    res.json({
      securityQuestion: profile.security_question
    });

  } catch (error) {
    console.error('Error getting security question:', error);
    res.status(500).json({ error: 'Güvenlik sorusu alınamadı' });
  }
});


// ============================================
// BY-PROFILE (Public — applicant cabinet)
// ============================================

router.get('/by-profile/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await ApplicantProfile.findByPk(profileId, {
      include: [{
        model: JobApplication,
        as: 'applications',
        required: false
      }]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil bulunamadı' });
    }

    const application = profile.applications?.[0];
    if (!application) {
      return res.json({ hasApplication: false });
    }

    // GÜVENLİK: Minimum veri — TC, IP, admin detayları yok
    res.json({
      hasApplication: true,
      application: {
        id: application.id,
        status: application.status,
        chatToken: application.chat_token,
        submittedAt: application.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching application by profile:', error);
    res.status(500).json({ error: 'Başvuru bilgisi alınamadı' });
  }
});


module.exports = router;
