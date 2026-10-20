import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'bnw-media-'));
process.env.DATABASE_URL ??= 'postgresql://unused';
process.env.UPLOAD_DIR = dir;

import sharp from 'sharp';
import { StorageService } from './core/storage.service';

describe('photo uploads', () => {
  const storage = new StorageService();

  it('strips EXIF (including GPS), applies orientation and caps the size', async () => {
    // A 4000×3000 JPEG tagged with a camera GPS position and "rotate 90°" orientation.
    const original = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#88aa99' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '12/1 58/1 0/1' } })
      .toBuffer();
    const before = await sharp(original).metadata();
    expect(before.exif).toBeDefined();
    expect(before.orientation).toBe(6);

    const stored = await storage.saveImage(original);
    const saved = readFileSync(path.join(dir, stored.key));
    const meta = await sharp(saved).metadata();

    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
    // Orientation 6 means the photo is really portrait: 3000×4000 → capped at 1600 on the long edge.
    expect([stored.width, stored.height]).toEqual([1200, 1600]);
  });

  it('rejects files that are not images', async () => {
    await expect(storage.saveImage(Buffer.from('not an image'))).rejects.toMatchObject({ status: 400 });
  });
});
