const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { InvitationLink, ApplicantProfile, JobApplication } = require('../models/associations');
const TokenService = require('../services/tokenService');

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

// Multer konfigürasyonu - Dosya yükleme
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'applications');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${req.body.token || 'unknown'}-${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    cv: ['.pdf', '.doc', '.docx'],
    internetTest: ['.jpg', '.jpeg', '.png', '.gif'],
    typingTest: ['.jpg', '.jpeg', '.png', '.gif']
  };

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const fieldAllowedTypes = allowedTypes[file.fieldname] || [];

  if (fieldAllowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`${file.fieldname} için geçersiz dosya türü: ${fileExtension}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Profil oluştur (CreateProfile sayfası için)
router.post('/profiles', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, token, real_ip, password, securityQuestion, securityAnswer, deviceInfo, vpnScore, isVpn, ipGeo } = req.body;
    const clientIP = getClientIP(req);

    if (!firstName || !lastName || !email || !phone || !token) {
      return res.status(400).json({ error: 'Tüm alanlar gerekli' });
    }

    // Token'ı doğrula
    const invitation = await InvitationLink.findOne({
      where: { token }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }

    if (invitation.status === 'used') {
      return res.status(410).json({ error: 'Bu davet linki daha önce kullanılmış' });
    }

    // Profil daha once olusturulmus mu kontrol et
    const existingProfile = await ApplicantProfile.findOne({
      where: { invitation_link_id: invitation.id }
    });
    if (existingProfile) {
      return res.status(409).json({
        error: 'Bu link için profil zaten oluşturulmuş',
        status: 'profile_exists',
        sessionToken: existingProfile.session_token
      });
    }

    // Gerçek IP'yi kullan, yoksa clientIP
    const realIP = real_ip || clientIP;

    // Session token oluştur
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sifre ve guvenlik sorusu hash'le
    let passwordHash = null;
    let securityAnswerHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    if (securityAnswer) {
      securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase(), 10);
    }

    // Profil oluştur (site_code invitation'dan alinir)
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

    // Invitation link durumunu guncelle (clicked -> clicked kalir, ENUM'da profile_created yok)
    await invitation.update({
      applicant_name: `${firstName} ${lastName}`,
      applicant_phone: phone
    });

    console.log('✅ Profil oluşturuldu, ID:', profile.id);

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
    res.status(500).json({ error: 'Profil oluşturulamadı', details: error.message });
  }
});

// Başvuru formu gönder
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

    // KVKK onayı kontrolü
    if (formData.kvkkApproved !== 'true') {
      return res.status(400).json({ error: 'KVKK onayı gerekli' });
    }

    // Invitation ve profile bul
    const invitation = await InvitationLink.findOne({
      where: { token: formData.token },
      include: [
        {
          model: ApplicantProfile,
          as: 'profiles'
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }

    if (invitation.status === 'used') {
      return res.status(410).json({ error: 'Bu davet linki daha önce kullanılmış' });
    }

    // Profil bul (invitation uzerinden veya dogrudan)
    let profile = invitation.profiles?.[0];
    if (!profile) {
      // Profil henuz yoksa olustur
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      profile = await ApplicantProfile.create({
        invitation_link_id: invitation.id,
        site_code: invitation.site_code || null,
        first_name: formData.firstName || 'Bilinmiyor',
        last_name: formData.lastName || '',
        email: invitation.email,
        phone: formData.phone || '',
        session_token: sessionToken,
        token: formData.token
      });
      console.log('✅ Profil otomatik oluşturuldu:', profile.id);
    }

    // IP adresi al (external API)
    let submittedLocation = null;
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      // Geolocation bilgisi için ek API çağrısı yapılabilir
    } catch (error) {
      console.log('IP bilgisi alınamadı:', error);
    }

    // Job application oluştur (site_code invitation'dan alinir)
    const application = await JobApplication.create({
      applicant_profile_id: profile.id,
      invitation_link_id: invitation.id,
      site_code: invitation.site_code || profile.site_code || null,

      // Kişisel bilgiler
      tc_number: formData.tcNumber,
      birth_date: formData.birthDate || null,

      // Adres
      address: formData.address,
      city: formData.city,
      district: formData.district,
      postal_code: formData.postalCode,

      // Eğitim
      education_level: formData.educationLevel,
      university: formData.university,
      department: formData.department,
      graduation_year: formData.graduationYear ? parseInt(formData.graduationYear) : null,
      gpa: formData.gpa ? parseFloat(formData.gpa) : null,

      // Deneyim
      has_sector_experience: formData.hasSectorExperience === 'true',
      experience_level: formData.experienceLevel,
      last_company: formData.lastCompany,
      last_position: formData.lastPosition,

      // Teknik
      internet_download: formData.internetDownload ? parseInt(formData.internetDownload) : null,
      internet_upload: formData.internetUpload ? parseInt(formData.internetUpload) : null,
      typing_speed: formData.typingSpeed ? parseInt(formData.typingSpeed) : null,
      processor: formData.processor,
      ram: formData.ram,
      os: formData.os,

      // Diğer
      source: formData.source,
      has_reference: formData.hasReference === 'true',
      reference_name: formData.referenceName,
      kvkk_approved: true,

      // Sistem
      status: 'submitted',
      submitted_ip: clientIP,
      submitted_location: submittedLocation,

      // LocalStorage uyumluluğu
      token: formData.token,
      profileId: profile.id
    });

    // Dosya yollarını application'a ekle
    const fileUpdates = {};
    if (files) {
      if (files.cv && files.cv[0]) {
        fileUpdates.cv_file_path = files.cv[0].path;
        fileUpdates.cv_file_name = files.cv[0].originalname;
      }
      if (files.internetTest && files.internetTest[0]) {
        fileUpdates.internet_test_file_path = files.internetTest[0].path;
        fileUpdates.internet_test_file_name = files.internetTest[0].originalname;
      }
      if (files.typingTest && files.typingTest[0]) {
        fileUpdates.typing_test_file_path = files.typingTest[0].path;
        fileUpdates.typing_test_file_name = files.typingTest[0].originalname;
      }
    }

    // Application'ı dosya yollarıyla güncelle
    if (Object.keys(fileUpdates).length > 0) {
      await application.update(fileUpdates);
    }

    const savedFiles = Object.keys(fileUpdates).length / 2; // Her dosya için 2 alan (path + name)

    // Invitation linki 'used' olarak isaretle
    await invitation.update({
      status: 'used',
      form_completed_at: new Date(),
      form_completed_ip: clientIP,
      applicant_name: `${profile.first_name} ${profile.last_name}`,
      applicant_phone: profile.phone,
      usedAt: new Date()
    });

    // Chat token olustur ve chat odasi olustur
    const chatToken = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await profile.update({
      chat_token: chatToken
    });

    // Chat odasi olustur
    try {
      const ChatRoom = require('../models/ChatRoom');
      await ChatRoom.create({
        site_code: invitation.site_code || null,
        room_type: 'applicant',
        applicant_id: profile.id,
        applicant_email: profile.email,
        applicant_name: `${profile.first_name} ${profile.last_name}`,
        room_name: `${profile.first_name} ${profile.last_name}`,
        is_active: true
      });
      console.log('✅ Chat odası oluşturuldu:', profile.id);
    } catch (chatErr) {
      console.error('⚠️ Chat odası oluşturulamadı:', chatErr.message);
    }

    res.json({
      success: true,
      applicationId: application.id,
      chatToken: chatToken,
      filesUploaded: savedFiles
    });

  } catch (error) {
    console.error('Error submitting application:', error);

    // Hata durumunda yüklenen dosyaları temizle
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

// Session doğrula
router.get('/session/:sessionToken', async (req, res) => {
  try {
    const { sessionToken } = req.params;

    const profile = await ApplicantProfile.findOne({
      where: { session_token: sessionToken },
      include: [
        {
          model: InvitationLink,
          as: 'invitation_link'
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Geçersiz session' });
    }

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

// Chat token ile profil doğrula
router.get('/chat/:chatToken', async (req, res) => {
  try {
    const { chatToken } = req.params;

    const profile = await ApplicantProfile.findOne({
      where: { chat_token: chatToken },
      include: [
        {
          model: InvitationLink,
          as: 'invitation_link'
        },
        {
          model: JobApplication,
          as: 'applications'
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Geçersiz chat token' });
    }

    res.json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      chatToken: profile.chat_token,
      application: profile.applications?.[0] || null,
      valid: true
    });
  } catch (error) {
    console.error('Error validating chat token:', error);
    res.status(500).json({ error: 'Chat token doğrulanamadı' });
  }
});

// Belirli bir başvuranın profilini getir (ID ile)
router.get('/profile/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;

    const profile = await ApplicantProfile.findByPk(applicantId, {
      include: [
        {
          model: InvitationLink,
          as: 'invitation_link',
          required: false
        },
        {
          model: JobApplication,
          as: 'applications',
          required: false
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profil bulunamadı' });
    }

    const application = profile.applications?.[0];

    res.json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      sessionToken: profile.session_token,
      chatToken: profile.chat_token,
      profileCreatedAt: profile.profile_created_at,
      profileCreatedIp: profile.profile_created_ip,
      application: application ? {
        id: application.id,
        tcNumber: application.tc_number,
        birthDate: application.birth_date,
        address: application.address,
        city: application.city,
        district: application.district,
        educationLevel: application.education_level,
        university: application.university,
        department: application.department,
        graduationYear: application.graduation_year,
        gpa: application.gpa,
        hasSectorExperience: application.has_sector_experience,
        experienceLevel: application.experience_level,
        lastCompany: application.last_company,
        lastPosition: application.last_position,
        internetDownload: application.internet_download,
        internetUpload: application.internet_upload,
        typingSpeed: application.typing_speed,
        processor: application.processor,
        ram: application.ram,
        os: application.os,
        source: application.source,
        hasReference: application.has_reference,
        referenceName: application.reference_name,
        status: application.status,
        submittedAt: application.submitted_at
      } : null,
      invitationLink: profile.invitation_link ? {
        token: profile.invitation_link.token,
        email: profile.invitation_link.email,
        status: profile.invitation_link.status
      } : null
    });
  } catch (error) {
    console.error('Error fetching applicant profile:', error);
    res.status(500).json({ error: 'Profil alınamadı' });
  }
});

// Tüm profilleri getir (Admin paneli için)
router.get('/profiles/all', async (req, res) => {
  try {
    const siteCode = req.headers['x-site-id'] || null;
    const where = {};
    if (siteCode) where.site_code = siteCode;

    let profiles = [];
    let includeAssociations = true;

    // Önce association'larla dene, başarısız olursa basit sorgu yap
    try {
      profiles = await ApplicantProfile.findAll({
        where,
        include: [
          {
            model: InvitationLink,
            as: 'invitation_link',
            required: false
          },
          {
            model: JobApplication,
            as: 'applications',
            required: false
          }
        ],
        order: [['profile_created_at', 'DESC']]
      });
    } catch (includeError) {
      console.warn('⚠️ Association query failed, falling back to simple query:', includeError.message);
      includeAssociations = false;
      profiles = await ApplicantProfile.findAll({
        where,
        order: [['profile_created_at', 'DESC']]
      });
    }

    const formattedProfiles = profiles.map(p => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone,
      chatToken: p.chat_token,
      sessionToken: p.session_token,
      createdAt: p.profile_created_at,
      siteCode: p.site_code,
      invitationLink: includeAssociations ? p.invitation_link : null,
      applications: includeAssociations ? p.applications : [],
      hasApplication: includeAssociations ? (p.applications && p.applications.length > 0) : false,
      applicationStatus: includeAssociations ? (p.applications?.[0]?.status || null) : null,
      // Cihaz ve ag bilgileri
      profileCreatedIp: p.profile_created_ip,
      profileCreatedLocation: p.profile_created_location,
      deviceInfo: p.device_info,
      vpnScore: p.vpn_score,
      isVpn: p.is_vpn,
      // Guvenlik sorusu (hash degil sadece soru metni)
      securityQuestion: p.security_question
    }));

    res.json(formattedProfiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Profiller alınamadı', details: error.message });
  }
});

// Tüm başvuruları getir (Admin paneli için)
router.get('/', async (req, res) => {
  try {
    const siteCode = req.headers['x-site-id'] || null;
    const where = {};
    if (siteCode) where.site_code = siteCode;

    let applications = [];
    let includeAssociations = true;

    // Önce association'larla dene, başarısız olursa basit sorgu yap
    try {
      applications = await JobApplication.findAll({
        where,
        include: [
          {
            model: ApplicantProfile,
            as: 'applicant_profile',
            required: false
          },
          {
            model: InvitationLink,
            as: 'invitation_link',
            required: false
          }
        ],
        order: [['submitted_at', 'DESC']]
      });
    } catch (includeError) {
      console.warn('⚠️ Association query failed, falling back to simple query:', includeError.message);
      includeAssociations = false;
      applications = await JobApplication.findAll({
        where,
        order: [['submitted_at', 'DESC']]
      });
    }

    // LocalStorage formatına uyumlu dönüştür
    const formattedApplications = applications.map(app => ({
      id: app.id,
      firstName: includeAssociations ? app.applicant_profile?.first_name : null,
      lastName: includeAssociations ? app.applicant_profile?.last_name : null,
      email: includeAssociations ? app.applicant_profile?.email : null,
      phone: includeAssociations ? app.applicant_profile?.phone : null,
      tcNumber: app.tc_number,
      birthDate: app.birth_date,
      address: app.address,
      city: app.city,
      district: app.district,
      educationLevel: app.education_level,
      university: app.university,
      department: app.department,
      graduationYear: app.graduation_year,
      gpa: app.gpa,
      hasSectorExperience: app.has_sector_experience,
      experienceLevel: app.experience_level,
      lastCompany: app.last_company,
      lastPosition: app.last_position,
      internetDownload: app.internet_download,
      internetUpload: app.internet_upload,
      typingSpeed: app.typing_speed,
      processor: app.processor,
      ram: app.ram,
      os: app.os,
      source: app.source,
      hasReference: app.has_reference,
      referenceName: app.reference_name,
      kvkkApproved: app.kvkk_approved,
      status: app.status,
      submittedAt: app.submitted_at,
      token: app.token,
      profileId: app.profileId,
      invitationLink: includeAssociations ? app.invitation_link : null
    }));

    res.json(formattedApplications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Başvurular alınamadı', details: error.message });
  }
});

// Profil ID'ye göre başvuru getir (Cabinet için)
router.get('/by-profile/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;

    const application = await JobApplication.findOne({
      where: { applicant_profile_id: profileId },
      include: [{
        model: ApplicantProfile,
        as: 'applicant_profile',
        required: false
      }],
      order: [['submitted_at', 'DESC']]
    });

    if (!application) {
      return res.status(404).json({ error: 'Başvuru bulunamadı' });
    }

    const profile = application.applicant_profile;

    res.json({
      id: application.id,
      email: profile?.email || '',
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      status: application.status,
      submittedAt: application.submitted_at,
      chatToken: profile?.chat_token,
      rejectReason: application.reject_reason
    });
  } catch (error) {
    console.error('Error getting application by profile:', error);
    res.status(500).json({ error: 'Başvuru alınamadı' });
  }
});

// Tek başvuru detayı getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByPk(id, {
      include: [{
        model: ApplicantProfile,
        as: 'applicant_profile',
        required: false
      }]
    });

    if (!application) {
      return res.status(404).json({ error: 'Başvuru bulunamadı' });
    }

    // Profil bilgisini de dahil et
    const profile = application.applicant_profile;

    res.json({
      id: application.id,
      email: profile?.email || application.email,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      tc_number: application.tc_number,
      birth_date: application.birth_date,
      address: application.address,
      city: application.city,
      district: application.district,
      postal_code: application.postal_code,
      education_level: application.education_level,
      university: application.university,
      department: application.department,
      graduation_year: application.graduation_year,
      gpa: application.gpa,
      has_sector_experience: application.has_sector_experience,
      experience_level: application.experience_level,
      last_company: application.last_company,
      last_position: application.last_position,
      internet_download: application.internet_download,
      internet_upload: application.internet_upload,
      typing_speed: application.typing_speed,
      processor: application.processor,
      ram: application.ram,
      os: application.os,
      source: application.source,
      has_reference: application.has_reference,
      reference_name: application.reference_name,
      kvkk_approved: application.kvkk_approved,
      status: application.status,
      submitted_at: application.submitted_at,
      submitted_ip: application.submitted_ip,
      cv_file_path: application.cv_file_path,
      cv_file_name: application.cv_file_name,
      internet_test_file_path: application.internet_test_file_path,
      internet_test_file_name: application.internet_test_file_name,
      typing_test_file_path: application.typing_test_file_path,
      typing_test_file_name: application.typing_test_file_name,
      applicant_profile_id: application.applicant_profile_id,
      // Profil bilgileri
      profileCreatedIp: profile?.profile_created_ip,
      profileCreatedLocation: profile?.profile_created_location,
      deviceInfo: profile?.device_info,
      vpnScore: profile?.vpn_score || 0,
      isVpn: profile?.is_vpn || false,
      chatToken: profile?.chat_token
    });
  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({ error: 'Başvuru alınamadı' });
  }
});

// Başvuru durumunu güncelle
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Başvuru bulunamadı' });
    }

    // Status'u guncelle, red ise red sebebini de kaydet
    const updateData = { status };
    if (status === 'rejected' && rejectReason) {
      updateData.reject_reason = rejectReason;
    }

    await application.update(updateData);
    res.json({ message: 'Durum güncellendi', status, rejectReason: updateData.reject_reason });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

// Başvuru sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Başvuru bulunamadı' });
    }

    await application.destroy();
    res.json({ message: 'Başvuru silindi' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Başvuru silinemedi' });
  }
});

// Aday giris (email + sifre veya guvenlik sorusu)
router.post('/applicant-login', async (req, res) => {
  try {
    const { email, password, securityAnswer, mode } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    // Profili email ile bul
    const profile = await ApplicantProfile.findOne({
      where: { email: email.toLowerCase() },
      include: [
        {
          model: JobApplication,
          as: 'applications'
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Bu email adresi ile kayitli bir profil bulunamadi' });
    }

    // Sifre ile giris
    if (mode === 'password' || !mode) {
      if (!password) {
        return res.status(400).json({ error: 'Sifre gerekli' });
      }

      if (!profile.password_hash) {
        return res.status(400).json({ error: 'Bu hesap icin sifre tanimlanmamis' });
      }

      const isValid = await bcrypt.compare(password, profile.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Sifre hatali' });
      }
    }
    // Guvenlik sorusu ile giris
    else if (mode === 'security') {
      if (!securityAnswer) {
        return res.status(400).json({ error: 'Guvenlik sorusu cevabi gerekli' });
      }

      if (!profile.security_answer_hash) {
        return res.status(400).json({ error: 'Bu hesap icin guvenlik sorusu tanimlanmamis' });
      }

      const isValid = await bcrypt.compare(securityAnswer.toLowerCase(), profile.security_answer_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Guvenlik sorusu cevabi yanlis' });
      }
    }
    else {
      return res.status(400).json({ error: 'Gecersiz giris modu' });
    }

    // Giris basarili - yeni session token olustur
    const newSessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await profile.update({ session_token: newSessionToken });

    const application = profile.applications?.[0];

    console.log('✅ Aday girisi basarili:', profile.email);

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
    res.status(500).json({ error: 'Giris islemi basarisiz' });
  }
});

// Guvenlik sorusunu getir (sifre sifirlama icin)
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

    if (!profile) {
      return res.status(404).json({ error: 'Bu email adresi ile kayitli bir profil bulunamadi' });
    }

    if (!profile.security_question) {
      return res.status(400).json({ error: 'Bu hesap icin guvenlik sorusu tanimlanmamis' });
    }

    res.json({
      securityQuestion: profile.security_question
    });

  } catch (error) {
    console.error('Error getting security question:', error);
    res.status(500).json({ error: 'Guvenlik sorusu alinamadi' });
  }
});

module.exports = router;