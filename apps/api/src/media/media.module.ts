import type { MediaInfo } from '@bnw/shared';
import { Controller, Injectable, Logger, Module, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Media } from '@prisma/client';
import { badRequest } from '../common/errors';
import { AuthUser, CurrentUser } from '../common/http';
import { PrismaService } from '../core/prisma.service';
import { RedisService } from '../core/redis.service';
import { MAX_UPLOAD_BYTES, mediaUrl, StorageService } from '../core/storage.service';

export const toMediaInfo = (m: Pick<Media, 'id' | 'key' | 'width' | 'height'>): MediaInfo => ({
  id: m.id,
  url: mediaUrl(m.key),
  width: m.width,
  height: m.height,
});

@Injectable()
export class MediaService {
  private readonly logger = new Logger('Media');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(user: AuthUser, file: Buffer): Promise<MediaInfo> {
    const stored = await this.storage.saveImage(file);
    const media = await this.prisma.media.create({ data: { ownerId: user.id, ...stored } });
    return toMediaInfo(media);
  }

  /** Daily job: delete photos uploaded but never attached to a post. */
  async cleanupUnattached() {
    const stale = await this.prisma.media.findMany({
      where: { postId: null, createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
      take: 500,
    });
    for (const m of stale) await this.storage.remove(m.key);
    if (stale.length) {
      await this.prisma.media.deleteMany({ where: { id: { in: stale.map((m) => m.id) } } });
      this.logger.log(`Removed ${stale.length} unattached uploads`);
    }
  }
}

@Controller('v1/media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly redis: RedisService,
  ) {}

  /** Upload one photo (multipart field "file"); attach it by id when creating a post. */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw badRequest('Choose a photo to upload');
    if (!/^image\//.test(file.mimetype)) throw badRequest('Only photos can be uploaded');
    await this.redis.rateLimit(`media:${user.id}`, 40, 3600, "You've uploaded a lot of photos. Try again in a bit.");
    return this.media.upload(user, file.buffer);
  }
}

@Module({ controllers: [MediaController], providers: [MediaService], exports: [MediaService] })
export class MediaModule {}
