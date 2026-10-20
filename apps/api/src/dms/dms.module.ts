import { sendDmSchema, startDmSchema } from '@bnw/shared';
import { Controller, Get, HttpCode, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser, ZBody, ZQuery } from '../common/http';
import { DmsService } from './dms.service';

const messagesQuery = z.object({
  before: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

@Controller('v1/dms')
export class DmsController {
  constructor(private readonly dms: DmsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.dms.list(user.id);
  }

  /** Recipient must share a club with the sender. */
  @Post()
  start(@CurrentUser() user: AuthUser, @ZBody(startDmSchema) body: z.infer<typeof startDmSchema>) {
    return this.dms.start(user, body.recipientId, body.body);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.dms.conversation(id, user.id);
  }

  @Get(':id/messages')
  messages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZQuery(messagesQuery) q: z.infer<typeof messagesQuery>) {
    return this.dms.messages(id, user.id, q.before, q.limit);
  }

  @Post(':id/messages')
  send(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(sendDmSchema) body: z.infer<typeof sendDmSchema>) {
    return this.dms.send(id, user, body.body);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.dms.markRead(id, user.id);
  }
}

@Module({ controllers: [DmsController], providers: [DmsService], exports: [DmsService] })
export class DmsModule {}
