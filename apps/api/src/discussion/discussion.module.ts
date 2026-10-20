import { createPostSchema, createThreadSchema, cursorQuery, editPostSchema } from '@bnw/shared';
import type { CreatePostInput, CreateThreadInput, CursorQuery } from '@bnw/shared';
import { Controller, Delete, Get, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser, ZBody, ZQuery } from '../common/http';
import { DiscussionService } from './discussion.service';

@Controller('v1')
export class DiscussionController {
  constructor(private readonly discussion: DiscussionService) {}

  @Get('clubs/:id/threads')
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.discussion.listThreads(id, user.id);
  }

  @Post('clubs/:id/threads')
  create(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(createThreadSchema) body: CreateThreadInput) {
    return this.discussion.createThread(id, user, body);
  }

  @Get('threads/:id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.discussion.getThread(id, user.id);
  }

  @Delete('threads/:id')
  removeThread(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.discussion.deleteThread(id, user);
  }

  @Get('threads/:id/posts')
  posts(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZQuery(cursorQuery) q: CursorQuery) {
    return this.discussion.listPosts(id, user.id, q.cursor, q.limit);
  }

  @Post('threads/:id/posts')
  createPost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(createPostSchema) body: CreatePostInput) {
    return this.discussion.createPost(id, user, body);
  }

  @Patch('posts/:id')
  editPost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(editPostSchema) body: z.infer<typeof editPostSchema>) {
    return this.discussion.editPost(id, user, body.body);
  }

  @Delete('posts/:id')
  deletePost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.discussion.deletePost(id, user);
  }
}

@Module({ controllers: [DiscussionController], providers: [DiscussionService], exports: [DiscussionService] })
export class DiscussionModule {}
