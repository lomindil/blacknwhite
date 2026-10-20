import { readingProfileSchema } from '@bnw/shared';
import type { ReadingProfileInput } from '@bnw/shared';
import { Controller, Get, Module, Put } from '@nestjs/common';
import { AuthUser, CurrentUser, ZBody } from '../common/http';
import { RecommendationsService } from './recommendations.service';

@Controller('v1/me')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Get('reading-profile')
  async profile(@CurrentUser() user: AuthUser) {
    return { profile: await this.recs.profile(user.id) };
  }

  @Put('reading-profile')
  saveProfile(@CurrentUser() user: AuthUser, @ZBody(readingProfileSchema) body: ReadingProfileInput) {
    return this.recs.saveProfile(user.id, body);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() user: AuthUser) {
    return this.recs.forUser(user.id);
  }
}

@Module({ controllers: [RecommendationsController], providers: [RecommendationsService] })
export class RecommendationsModule {}
