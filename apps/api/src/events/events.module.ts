import { createEventSchema, eventListQuery, rsvpSchema, updateEventSchema } from '@bnw/shared';
import type { CreateEventInput, UpdateEventInput } from '@bnw/shared';
import { Controller, Delete, Get, Header, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, ZBody, ZQuery } from '../common/http';
import { RedisService } from '../core/redis.service';
import { EventsService } from './events.service';

@Controller('v1/events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  list(@ZQuery(eventListQuery) q: z.infer<typeof eventListQuery>, @CurrentUser() user?: AuthUser) {
    return this.events.list(q, user?.id);
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @ZBody(createEventSchema) body: CreateEventInput) {
    await this.redis.rateLimit(`event:create:${user.id}`, 20, 24 * 3600);
    return this.events.create(user, body);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.events.get(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(updateEventSchema) body: UpdateEventInput) {
    return this.events.update(id, user, body);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.events.cancel(id, user);
  }

  @Post(':id/rsvp')
  @HttpCode(200)
  rsvp(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(rsvpSchema) body: z.infer<typeof rsvpSchema>) {
    return this.events.rsvp(id, user, body.status);
  }

  @Get(':id/rsvps')
  attendees(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.events.attendees(id, user);
  }

  @Public()
  @Get(':id/ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="event.ics"')
  ics(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.events.ics(id, user);
  }
}

@Module({ controllers: [EventsController], providers: [EventsService], exports: [EventsService] })
export class EventsModule {}
