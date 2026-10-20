import {
  clubListQuery,
  createClubSchema,
  createInviteSchema,
  createPollSchema,
  setClubBookSchema,
  updateClubSchema,
  updateMemberSchema,
  updateScheduleSchema,
  voteSchema,
} from '@bnw/shared';
import type {
  CreateClubInput,
  CreatePollInput,
  SetClubBookInput,
  UpdateClubInput,
  UpdateScheduleInput,
} from '@bnw/shared';
import { Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, ZBody, ZQuery } from '../common/http';
import { RedisService } from '../core/redis.service';
import { ClubsService } from './clubs.service';
import { PollsService } from './polls.service';

@Controller('v1')
export class ClubsController {
  constructor(
    private readonly clubs: ClubsService,
    private readonly polls: PollsService,
    private readonly redis: RedisService,
  ) {}

  @Post('clubs')
  async create(@CurrentUser() user: AuthUser, @ZBody(createClubSchema) body: CreateClubInput) {
    await this.redis.rateLimit(`club:create:${user.id}`, 5, 24 * 3600, "You've created several clubs today. Try again tomorrow.");
    return this.clubs.create(user, body);
  }

  @Public()
  @Get('clubs')
  list(@ZQuery(clubListQuery) q: z.infer<typeof clubListQuery>) {
    return this.clubs.list(q);
  }

  @Get('me/clubs')
  mine(@CurrentUser() user: AuthUser) {
    return this.clubs.mine(user.id);
  }

  @Public()
  @Get('clubs/:slug')
  detail(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.clubs.detail(slug, user?.id);
  }

  @Patch('clubs/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(updateClubSchema) body: UpdateClubInput) {
    return this.clubs.update(id, user, body);
  }

  @Delete('clubs/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clubs.remove(id, user);
  }

  @Post('clubs/:id/join')
  @HttpCode(200)
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clubs.join(id, user);
  }

  @Post('clubs/:id/leave')
  @HttpCode(200)
  leave(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clubs.leave(id, user);
  }

  @Get('clubs/:id/members')
  members(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clubs.members(id, user.id);
  }

  @Patch('clubs/:id/members/:userId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
    @ZBody(updateMemberSchema) body: z.infer<typeof updateMemberSchema>,
  ) {
    return this.clubs.updateMember(id, user, userId, body.role);
  }

  @Delete('clubs/:id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clubs.removeMember(id, user, userId);
  }

  @Post('clubs/:id/invites')
  createInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ZBody(createInviteSchema) body: z.infer<typeof createInviteSchema>,
  ) {
    return this.clubs.createInvite(id, user, body);
  }

  @Get('clubs/:id/invites')
  listInvites(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clubs.listInvites(id, user);
  }

  @Delete('clubs/:id/invites/:code')
  revokeInvite(@Param('id', ParseUUIDPipe) id: string, @Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.clubs.revokeInvite(id, user, code);
  }

  @Public()
  @Get('invites/:code')
  previewInvite(@Param('code') code: string, @CurrentUser() user?: AuthUser) {
    return this.clubs.previewInvite(code, user?.id);
  }

  @Post('invites/:code/accept')
  @HttpCode(200)
  acceptInvite(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.clubs.acceptInvite(code, user);
  }

  @Post('clubs/:id/books')
  setBook(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(setClubBookSchema) body: SetClubBookInput) {
    return this.clubs.setBook(id, user, body);
  }

  @Put('clubs/:id/books/:clubBookId/schedule')
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('clubBookId', ParseUUIDPipe) clubBookId: string,
    @CurrentUser() user: AuthUser,
    @ZBody(updateScheduleSchema) body: UpdateScheduleInput,
  ) {
    return this.clubs.updateSchedule(id, clubBookId, user, body);
  }

  @Post('clubs/:id/polls')
  createPoll(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(createPollSchema) body: CreatePollInput) {
    return this.polls.create(id, user, body);
  }

  @Get('clubs/:id/polls')
  listPolls(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.polls.list(id, user.id);
  }

  @Post('polls/:id/votes')
  @HttpCode(200)
  vote(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(voteSchema) body: z.infer<typeof voteSchema>) {
    return this.polls.vote(id, user, body.optionId);
  }

  @Post('polls/:id/close')
  @HttpCode(200)
  closePoll(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.polls.close(id, user);
  }
}

@Module({
  controllers: [ClubsController],
  providers: [ClubsService, PollsService],
  exports: [ClubsService],
})
export class ClubsModule {}
