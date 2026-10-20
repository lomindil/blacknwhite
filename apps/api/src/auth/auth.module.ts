import { Global, Module } from '@nestjs/common';
import { AccountService, AuthController } from './auth.controller';
import { GoogleAuthService } from './google.service';
import { SessionService } from './session.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [SessionService, GoogleAuthService, AccountService],
  exports: [SessionService, AccountService],
})
export class AuthModule {}
