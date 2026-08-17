import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

/**
 * Check if Cloudflare R2 is fully configured in process.env
 */
export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Upload a file to Cloudflare R2 or fall back to local disk storage.
 * @param {Object} options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.filename - File name
 * @param {string} options.mimeType - MIME content type
 * @param {string} [options.schoolId] - Tenant school ID for path isolation
 * @param {string} [options.category] - Asset category ('logos', 'favicons', 'banners', 'materials', 'assignments')
 * @returns {Promise<{ key: string, url: string, provider: 'r2' | 'local' }>}
 */
export async function uploadFile({ buffer, filename, mimeType, schoolId = 'global', category = 'general' }) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const fileKey = `${schoolId}/${category}/${Date.now()}_${sanitizedFilename}`;

  if (isR2Configured()) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });

      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      const publicDomain = process.env.R2_PUBLIC_DOMAIN || `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const url = `${publicDomain}/${fileKey}`;

      return { key: fileKey, url, provider: 'r2' };
    } catch (err) {
      console.warn('[Storage] R2 upload failed, falling back to local storage:', err.message);
    }
  }

  // Local Storage Fallback
  const targetDir = path.join(LOCAL_UPLOADS_DIR, schoolId, category);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const localPath = path.join(targetDir, `${Date.now()}_${sanitizedFilename}`);
  fs.writeFileSync(localPath, buffer);

  const relativeUrl = `/uploads/${schoolId}/${category}/${path.basename(localPath)}`;
  return { key: fileKey, url: relativeUrl, provider: 'local' };
}

/**
 * Delete a file from R2 or local disk storage.
 * @param {string} fileKey
 */
export async function deleteFile(fileKey) {
  if (!fileKey) return;

  if (isR2Configured()) {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });

      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
        })
      );
      return;
    } catch (err) {
      console.warn('[Storage] R2 delete failed:', err.message);
    }
  }

  // Local deletion fallback
  try {
    const localFilePath = path.join(LOCAL_UPLOADS_DIR, fileKey);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    console.warn('[Storage] Local delete error:', err.message);
  }
}
