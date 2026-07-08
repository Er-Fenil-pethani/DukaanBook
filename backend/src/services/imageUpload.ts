import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!ok) return cb(new Error('Only JPEG, PNG, WebP allowed'));
    cb(null, true);
  },
});

export async function processProductImage(
  buffer: Buffer,
  outputPath: string,
  maxWidth = 800
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(outputPath);
}

export async function removeFileIfExists(absolutePath: string): Promise<void> {
  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore
  }
}
