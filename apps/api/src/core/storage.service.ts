import { Injectable, Logger } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { badRequest } from '../common/errors';
import { env } from '../config/env';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1600;

export interface StoredImage {
  key: string;
  width: number;
  height: number;
  bytes: number;
}

export const uploadDir = () => path.resolve(env().UPLOAD_DIR);
export const mediaUrl = (key: string) => `${env().MEDIA_BASE_URL.replace(/\/$/, '')}/${key}`;

/**
 * Photo storage. Every image is decoded and re-encoded with sharp, which strips EXIF
 * (including GPS location), applies the camera orientation, caps the size and converts to WebP.
 * Dev and single-server deploys write to UPLOAD_DIR; swap save/remove for R2 when moving storage.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');

  async saveImage(input: Buffer): Promise<StoredImage> {
    let output: { data: Buffer; info: sharp.OutputInfo };
    try {
      output = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw badRequest("That file isn't an image we can read. Try a JPEG, PNG or WebP photo.");
    }
    const now = new Date();
    const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.webp`;
    const file = path.join(uploadDir(), key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, output.data);
    return { key, width: output.info.width, height: output.info.height, bytes: output.info.size };
  }

  async remove(key: string) {
    try {
      await rm(path.join(uploadDir(), key), { force: true });
    } catch (e) {
      this.logger.warn(`Could not remove ${key}: ${(e as Error).message}`);
    }
  }
}
