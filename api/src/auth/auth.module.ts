import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { jwtSecret } from './jwt-secret';
import { LoginRateLimiter } from './login-rate-limiter';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecret(config),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') as `${number}${'s'|'m'|'h'|'d'}` },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, LoginRateLimiter],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
