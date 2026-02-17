// backend-express/routes/files.js — Dosya Yönetim Sistemi
const express = require('express');
const router = express.Router();
const multer = require('multer');
const r2Storage = require('../services/r2StorageService');

const getSiteCode = (req) => req.headers['x-site-id'] || req.headers['x-site-code'] || 'DEFAULT';
const getEmployeeId = (req) => req.headers['x-employee-id'] || null;

// Multer — memory storage for R2
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// GET /api/files — Dosya listesi (folder_id ile filtreleme)
router.get('/', async (req, res) => {
    try {
        const { ManagedFile, FileFolder, Employee } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const { folder_id, search, type } = req.query;

        const where = { site_code: siteCode, is_deleted: false };
        if (folder_id) where.folder_id = folder_id === 'root' ? null : parseInt(folder_id);
        else where.folder_id = null; // Default: root level

        if (search) {
            const { Op } = require('sequelize');
            where.name = { [Op.iLike]: `%${search}%` };
        }

        if (type) {
            const { Op } = require('sequelize');
            where.mime_type = { [Op.iLike]: `%${type}%` };
        }

        const files = await ManagedFile.findAll({
            where,
            include: [{ model: Employee, as: 'uploader', attributes: ['id', 'first_name', 'last_name'], required: false }],
            order: [['created_at', 'DESC']]
        });

        // Also get folders at this level
        const folderWhere = { site_code: siteCode };
        folderWhere.parent_id = folder_id && folder_id !== 'root' ? parseInt(folder_id) : null;

        const folders = await FileFolder.findAll({ where: folderWhere, order: [['name', 'ASC']] });

        // Count files in each folder
        const folderData = await Promise.all(folders.map(async (f) => {
            const count = await ManagedFile.count({ where: { folder_id: f.id, is_deleted: false } });
            return { ...f.toJSON(), file_count: count };
        }));

        res.json({ files, folders: folderData });
    } catch (error) {
        console.error('File list error:', error);
        res.status(500).json({ error: 'Dosyalar yüklenemedi', details: error.message });
    }
});

// POST /api/files/upload — Dosya yükle
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { ManagedFile, Employee } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { folder_id } = req.body;

        if (!req.file) return res.status(400).json({ error: 'Dosya gerekli' });

        let storageKey, storageType;

        if (r2Storage.isR2Enabled()) {
            const key = r2Storage.generateSafeKey(req.file.originalname, `files/${siteCode}`);
            await r2Storage.uploadFile(req.file.buffer, key, req.file.mimetype);
            storageKey = key;
            storageType = 'r2';
        } else {
            // Local storage fallback
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, '..', 'uploads', 'files');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const fileName = `${Date.now()}_${req.file.originalname}`;
            fs.writeFileSync(path.join(uploadsDir, fileName), req.file.buffer);
            storageKey = `uploads/files/${fileName}`;
            storageType = 'local';
        }

        const file = await ManagedFile.create({
            name: req.file.originalname,
            original_name: req.file.originalname,
            storage_key: storageKey,
            folder_id: folder_id ? parseInt(folder_id) : null,
            size: req.file.size,
            mime_type: req.file.mimetype,
            storage_type: storageType,
            uploaded_by: employeeId,
            site_code: siteCode
        });

        const fullFile = await ManagedFile.findByPk(file.id, {
            include: [{ model: Employee, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }]
        });

        res.status(201).json(fullFile);
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Dosya yüklenemedi', details: error.message });
    }
});

// POST /api/files/:id/new-version — Yeni versiyon yükle
router.post('/:id/new-version', upload.single('file'), async (req, res) => {
    try {
        const { ManagedFile, FileVersion, Employee } = require('../models/associations');
        const employeeId = getEmployeeId(req);
        const { comment } = req.body;

        if (!req.file) return res.status(400).json({ error: 'Dosya gerekli' });

        const existingFile = await ManagedFile.findByPk(req.params.id);
        if (!existingFile) return res.status(404).json({ error: 'Dosya bulunamadı' });

        // Save current version to history
        await FileVersion.create({
            file_id: existingFile.id,
            version_number: existingFile.version,
            storage_key: existingFile.storage_key,
            size: existingFile.size,
            uploaded_by: existingFile.uploaded_by,
            comment: comment || null
        });

        // Upload new version
        let newStorageKey;
        if (r2Storage.isR2Enabled()) {
            const key = r2Storage.generateSafeKey(req.file.originalname, `files/${existingFile.site_code}`);
            await r2Storage.uploadFile(req.file.buffer, key, req.file.mimetype);
            newStorageKey = key;
        } else {
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, '..', 'uploads', 'files');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const fileName = `${Date.now()}_${req.file.originalname}`;
            fs.writeFileSync(path.join(uploadsDir, fileName), req.file.buffer);
            newStorageKey = `uploads/files/${fileName}`;
        }

        // Update file with new version
        await existingFile.update({
            storage_key: newStorageKey,
            size: req.file.size,
            mime_type: req.file.mimetype,
            name: req.file.originalname,
            original_name: req.file.originalname,
            version: existingFile.version + 1,
            uploaded_by: employeeId
        });

        const fullFile = await ManagedFile.findByPk(existingFile.id, {
            include: [{ model: Employee, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }]
        });

        res.json(fullFile);
    } catch (error) {
        console.error('File version upload error:', error);
        res.status(500).json({ error: 'Yeni versiyon yüklenemedi', details: error.message });
    }
});

// GET /api/files/:id/versions — Versiyon geçmişi
router.get('/:id/versions', async (req, res) => {
    try {
        const { FileVersion, Employee } = require('../models/associations');
        const versions = await FileVersion.findAll({
            where: { file_id: req.params.id },
            include: [{ model: Employee, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }],
            order: [['version_number', 'DESC']]
        });
        res.json(versions);
    } catch (error) {
        console.error('File versions error:', error);
        res.status(500).json({ error: 'Versiyon geçmişi yüklenemedi' });
    }
});

// POST /api/files/:id/versions/:versionId/restore — Eski versiyonu geri yükle
router.post('/:id/versions/:versionId/restore', async (req, res) => {
    try {
        const { ManagedFile, FileVersion, Employee } = require('../models/associations');
        const employeeId = getEmployeeId(req);

        const file = await ManagedFile.findByPk(req.params.id);
        if (!file) return res.status(404).json({ error: 'Dosya bulunamadı' });

        const version = await FileVersion.findByPk(req.params.versionId);
        if (!version || version.file_id !== file.id) return res.status(404).json({ error: 'Versiyon bulunamadı' });

        // Save current as version before restoring
        await FileVersion.create({
            file_id: file.id,
            version_number: file.version,
            storage_key: file.storage_key,
            size: file.size,
            uploaded_by: file.uploaded_by,
            comment: 'Otomatik yedek (geri yükleme öncesi)'
        });

        await file.update({
            storage_key: version.storage_key,
            size: version.size,
            version: file.version + 1,
            uploaded_by: employeeId
        });

        res.json({ message: 'Versiyon geri yüklendi', file });
    } catch (error) {
        console.error('Version restore error:', error);
        res.status(500).json({ error: 'Versiyon geri yüklenemedi' });
    }
});

// GET /api/files/:id/download — Dosya indirme (signed URL veya stream)
router.get('/:id/download', async (req, res) => {
    try {
        const { ManagedFile } = require('../models/associations');
        const file = await ManagedFile.findByPk(req.params.id);
        if (!file) return res.status(404).json({ error: 'Dosya bulunamadı' });

        if (file.storage_type === 'r2' && r2Storage.isR2Enabled()) {
            const signedUrl = await r2Storage.getSignedDownloadUrl(file.storage_key, 3600);
            res.json({ url: signedUrl, name: file.name });
        } else {
            const path = require('path');
            const filePath = path.join(__dirname, '..', file.storage_key);
            res.download(filePath, file.original_name);
        }
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ error: 'Dosya indirilemedi' });
    }
});

// DELETE /api/files/:id — Soft delete
router.delete('/:id', async (req, res) => {
    try {
        const { ManagedFile } = require('../models/associations');
        const file = await ManagedFile.findByPk(req.params.id);
        if (!file) return res.status(404).json({ error: 'Dosya bulunamadı' });

        await file.update({ is_deleted: true });
        res.json({ message: 'Dosya silindi' });
    } catch (error) {
        console.error('File delete error:', error);
        res.status(500).json({ error: 'Dosya silinemedi' });
    }
});

// POST /api/files/folder — Yeni klasör oluştur
router.post('/folder', async (req, res) => {
    try {
        const { FileFolder } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { name, parent_id, color } = req.body;

        if (!name) return res.status(400).json({ error: 'Klasör adı gerekli' });

        const folder = await FileFolder.create({
            name: name.trim(),
            parent_id: parent_id || null,
            created_by: employeeId,
            site_code: siteCode,
            color: color || '#1c61ab'
        });

        res.status(201).json(folder);
    } catch (error) {
        console.error('Folder create error:', error);
        res.status(500).json({ error: 'Klasör oluşturulamadı' });
    }
});

// PUT /api/files/folder/:id — Klasörü güncelle
router.put('/folder/:id', async (req, res) => {
    try {
        const { FileFolder } = require('../models/associations');
        const folder = await FileFolder.findByPk(req.params.id);
        if (!folder) return res.status(404).json({ error: 'Klasör bulunamadı' });

        const { name, color } = req.body;
        if (name) folder.name = name.trim();
        if (color) folder.color = color;
        await folder.save();

        res.json(folder);
    } catch (error) {
        console.error('Folder update error:', error);
        res.status(500).json({ error: 'Klasör güncellenemedi' });
    }
});

// DELETE /api/files/folder/:id — Klasörü sil
router.delete('/folder/:id', async (req, res) => {
    try {
        const { FileFolder, ManagedFile } = require('../models/associations');
        const folder = await FileFolder.findByPk(req.params.id);
        if (!folder) return res.status(404).json({ error: 'Klasör bulunamadı' });

        // Move files to root
        await ManagedFile.update({ folder_id: null }, { where: { folder_id: folder.id } });
        // Delete sub-folders (move to root)
        await FileFolder.update({ parent_id: null }, { where: { parent_id: folder.id } });

        await folder.destroy();
        res.json({ message: 'Klasör silindi' });
    } catch (error) {
        console.error('Folder delete error:', error);
        res.status(500).json({ error: 'Klasör silinemedi' });
    }
});

module.exports = router;
