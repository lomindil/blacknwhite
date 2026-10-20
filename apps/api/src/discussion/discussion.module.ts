import { boardPostSchema, createPostSchema, createThreadSchema, cursorQuery, editPostSchema, reactionSchema, replySchema } from '@bnw/shared';
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

  @Get('clubs/:id/board')
  board(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZQuery(cursorQuery) q: CursorQuery) {
    return this.discussion.board(id, user.id, q.cursor, q.limit);
  }

  @Post('clubs/:id/board')
  postToBoard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(boardPostSchema) body: z.infer<typeof boardPostSchema>) {
    return this.discussion.postToBoard(id, user, body);
  }

  @Get('board-posts/:id')
  boardPost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.discussion.boardPost(id, user.id);
  }

  /** Toggle a 👍 or ❤️ reaction. */
  @Post('posts/:id/reactions')
  react(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(reactionSchema) body: z.infer<typeof reactionSchema>) {
    return this.discussion.react(id, user, body.kind);
  }

  @Post('posts/:id/replies')
  reply(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(replySchema) body: z.infer<typeof replySchema>) {
    return this.discussion.reply(id, user, body.body);
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
