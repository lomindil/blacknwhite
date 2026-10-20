import { cursorQuery, markNotificationsReadSchema, updateMeSchema, updateSettingsSchema } from '@bnw/shared';
import type { CursorQuery, UpdateMeInput, UpdateSettingsInput } from '@bnw/shared';
import { Controller, Delete, Get, Header, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, ZBody, ZQuery } from '../common/http';
import { SessionService } from '../auth/session.service';
import { BooksModule } from '../books/books.controller';
import { DmsModule } from '../dms/dms.module';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  @Get('v1/me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch('v1/me')
  updateMe(@CurrentUser() user: AuthUser, @ZBody(updateMeSchema) body: UpdateMeInput) {
    return this.users.updateMe(user, body);
  }

  @Patch('v1/me/settings')
  updateSettings(@CurrentUser() user: AuthUser, @ZBody(updateSettingsSchema) body: UpdateSettingsInput) {
    return this.users.updateSettings(user, body);
  }

  @Delete('v1/me')
  async deleteMe(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.users.deleteMe(user);
    this.sessions.clearCookies(res);
    return result;
  }

  @Get('v1/me/export')
  @Header('Content-Disposition', 'attachment; filename="my-data.json"')
  exportData(@CurrentUser() user: AuthUser) {
    return this.users.exportData(user.id);
  }

  @Get('v1/me/home')
  home(@CurrentUser() user: AuthUser) {
    return this.users.home(user);
  }

  @Get('v1/me/blocks')
  blocks(@CurrentUser() user: AuthUser) {
    return this.users.blocks(user.id);
  }

  @Public()
  @Get('v1/users/:id')
  profile(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.users.profile(id, user);
  }

  @Public()
  @Get('v1/cities')
  cities() {
    return this.users.activeCities();
  }

  @Public()
  @Get('v1/cities/:city')
  city(@Param('city') city: string, @CurrentUser() user?: AuthUser) {
    return this.users.city(city.toLowerCase(), user?.id);
  }

  @Get('v1/notifications')
  notifications(@CurrentUser() user: AuthUser, @ZQuery(cursorQuery) q: CursorQuery) {
    return this.users.notifications(user.id, q.cursor, q.limit);
  }

  @Post('v1/notifications/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: AuthUser, @ZBody(markNotificationsReadSchema) body: z.infer<typeof markNotificationsReadSchema>) {
    return this.users.markNotificationsRead(user.id, body.ids);
  }
}

@Module({
  imports: [BooksModule, DmsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
