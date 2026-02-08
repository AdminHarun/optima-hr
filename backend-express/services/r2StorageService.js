// R2 Storage Service - Cloudflare R2 ile S3-uyumlu dosya depolama

// AWS SDK'yı güvenli bir şekilde yüklemeyi dene
let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, getSignedUrl;
let sdkAvailable = false;

try {
  const s3Module = require('@aws-sdk/client-s3');
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
  GetObjectCommand = s3Module.GetObjectCommand;
  DeleteObjectCommand = s3Module.DeleteObjectCommand;
  HeadObjectCommand = s3Module.HeadObjectCommand;

  const presignerModule = require('@aws-sdk/s3-request-presigner');
  getSignedUrl = presignerModule.getSignedUrl;

  sdkAvailable = true;
  console.log('✅ AWS SDK yüklendi - R2 desteği aktif');
} catch (error) {
  console.log('⚠️ AWS SDK bulunamadı - R2 devre dışı, lokal depolama kullanılacak');
  sdkAvailable = false;
}

// R2 credentials kontrolü
const isR2Enabled = () => {
  if (!sdkAvailable) return false;
  return !!(process.env.R2_ACCOUNT_ID &&
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY);
};

// S3 Client (R2 uyumlu)
let s3Client = null;

const getS3Client = () => {
  if (!sdkAvailable) return null;
  if (!s3Client && isR2Enabled()) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

const BUCKET = process.env.R2_BUCKET_NAME || 'optima-hr-files';

/**
 * Dosyayı R2'ye yükle
 * @param {Buffer} buffer - Dosya içeriği
 * @param {string} key - R2 key (örn: applications/cv/token-123.pdf)
 * @param {string} contentType - MIME type
 * @param {object} metadata - Opsiyonel metadata
 * @returns {Promise<{success: boolean, key: string, url: string}>}
 */
async function uploadFile(buffer, key, contentType, metadata = {}) {
  const client = getS3Client();

  if (!client) {
    throw new Error('R2 yapılandırması eksik. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ve R2_SECRET_ACCESS_KEY gerekli.');
  }

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata
    });

    await client.send(command);

    console.log(`✅ R2 Upload başarılı: ${key}`);

    return {
      success: true,
      key: key,
      url: getPublicUrl(key)
    };
  } catch (error) {
    console.error('❌ R2 Upload hatası:', error.message);
    throw error;
  }
}

/**
 * Dosyayı R2'den indir (Buffer olarak)
 * @param {string} key - R2 key
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function downloadFile(key) {
  const client = getS3Client();

  if (!client) {
    throw new Error('R2 yapılandırması eksik.');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    const response = await client.send(command);

    // Stream'i buffer'a çevir
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      contentType: response.ContentType,
      contentLength: response.ContentLength
    };
  } catch (error) {
    console.error('❌ R2 Download hatası:', error.message);
    throw error;
  }
}

/**
 * Signed download URL oluştur (geçici erişim linki)
 * @param {string} key - R2 key
 * @param {number} expiresIn - Geçerlilik süresi (saniye), varsayılan 1 saat
 * @returns {Promise<string>}
 */
async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const client = getS3Client();

  if (!client) {
    throw new Error('R2 yapılandırması eksik.');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('❌ R2 Signed URL hatası:', error.message);
    throw error;
  }
}

/**
 * Dosyayı R2'den sil
 * @param {string} key - R2 key
 * @returns {Promise<boolean>}
 */
async function deleteFile(key) {
  const client = getS3Client();

  if (!client) {
    throw new Error('R2 yapılandırması eksik.');
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    await client.send(command);
    console.log(`✅ R2 Delete başarılı: ${key}`);
    return true;
  } catch (error) {
    console.error('❌ R2 Delete hatası:', error.message);
    throw error;
  }
}

/**
 * Dosyanın var olup olmadığını kontrol et
 * @param {string} key - R2 key
 * @returns {Promise<boolean>}
 */
async function fileExists(key) {
  const client = getS3Client();

  if (!client) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Public URL oluştur (R2 public bucket için)
 * @param {string} key - R2 key
 * @returns {string}
 */
function getPublicUrl(key) {
  // Eğer public URL tanımlıysa kullan
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }

  // Aksi halde signed URL gerekecek
  return null;
}

/**
 * Dosya uzantısından MIME type belirle
 * @param {string} filename
 * @returns {string}
 */
function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'txt': 'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Güvenli dosya adı oluştur
 * @param {string} originalName
 * @param {string} prefix
 * @returns {string}
 */
function generateSafeKey(originalName, prefix = '') {
  const ext = originalName.split('.').pop();
  const baseName = originalName
    .replace(/\.[^/.]+$/, '') // Uzantıyı kaldır
    .replace(/[^a-zA-Z0-9]/g, '_') // Özel karakterleri _ ile değiştir
    .substring(0, 50); // Maksimum 50 karakter

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  const key = prefix
    ? `${prefix}/${baseName}_${timestamp}_${random}.${ext}`
    : `${baseName}_${timestamp}_${random}.${ext}`;

  return key;
}

module.exports = {
  isR2Enabled,
  uploadFile,
  downloadFile,
  getSignedDownloadUrl,
  deleteFile,
  fileExists,
  getPublicUrl,
  getMimeType,
  generateSafeKey,
  BUCKET
};
