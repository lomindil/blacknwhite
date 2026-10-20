import {
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { badRequest } from '../common/errors';
import { AuthUser, CurrentUser } from '../common/http';
import { RedisService } from '../core/redis.service';
import { ImportsService } from './imports.service';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

@Controller('v1/me/import')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly redis: RedisService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_BYTES } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw badRequest('Attach your exported CSV file');
    await this.redis.rateLimit(`import:${user.id}`, 5, 3600, 'Too many imports. Try again in an hour.');
    return this.imports.start(user.id, file.buffer.toString('utf8'));
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.imports.list(user.id);
  }

  @Get(':jobId')
  get(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.imports.get(user.id, jobId);
  }
}

@Module({ controllers: [ImportsController], providers: [ImportsService], exports: [ImportsService] })
export class ImportsModule {}
