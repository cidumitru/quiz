import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from './auth.module';
import { User, OtpCode } from '../entities';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let otpRepository: Repository<OtpCode>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'sqlite',
            database: ':memory:',
            entities: [User, OtpCode],
            synchronize: true,
          }),
        }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: 'test-secret',
            signOptions: { expiresIn: '1h' },
          }),
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    otpRepository = moduleFixture.get<Repository<OtpCode>>(getRepositoryToken(OtpCode));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await otpRepository.delete({});
    await userRepository.delete({});
  });

  describe('POST /auth/request-otp', () => {
    it('should successfully request OTP for valid Gmail account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({ email: 'test@gmail.com' })
        .expect(201);

      expect(response.body).toEqual({
        message: 'OTP sent to your email',
      });

      // Verify user was created
      const user = await userRepository.findOne({ where: { email: 'test@gmail.com' } });
      expect(user).toBeDefined();
      expect(user!.email).toBe('test@gmail.com');
      expect(user!.isVerified).toBe(false);

      // Verify OTP was created
      const otpCode = await otpRepository.findOne({ where: { userId: user!.id } });
      expect(otpCode).toBeDefined();
      expect(otpCode!.code).toMatch(/^\d{6}$/);
      expect(otpCode!.isUsed).toBe(false);
    });

    it('should reject non-Gmail accounts', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({ email: 'test@yahoo.com' })
        .expect(400);

      expect(response.body.message).toBe('Only Gmail accounts are allowed for registration');
    });

    it('should enforce rate limiting', async () => {
      const email = 'test@gmail.com';

      // Create a user with many recent OTP requests
      const user = userRepository.create({ email });
      await userRepository.save(user);

      // Create 10 OTP codes (the limit)
      const otpCodes = Array.from({ length: 10 }, (_, i) => 
        otpRepository.create({
          userId: user.id,
          code: `12345${i}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        })
      );
      await otpRepository.save(otpCodes);

      const response = await request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({ email })
        .expect(400);

      expect(response.body.message).toBe('Too many OTP requests. Please wait 2 minutes.');
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should handle missing email field', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });

  describe('POST /auth/verify-otp', () => {
    let user: User;
    let validOtpCode: OtpCode;

    beforeEach(async () => {
      // Setup test data
      user = userRepository.create({ email: 'test@gmail.com' });
      await userRepository.save(user);

      validOtpCode = otpRepository.create({
        userId: user.id,
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        isUsed: false,
      });
      await otpRepository.save(validOtpCode);
    });

    it('should successfully verify OTP and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@gmail.com',
          code: '123456',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: user.id,
          email: 'test@gmail.com',
          isVerified: true,
        },
      });

      // Verify OTP was marked as used
      const updatedOtp = await otpRepository.findOne({ where: { id: validOtpCode.id } });
      expect(updatedOtp!.isUsed).toBe(true);

      // Verify user was marked as verified
      const updatedUser = await userRepository.findOne({ where: { id: user.id } });
      expect(updatedUser!.isVerified).toBe(true);
    });

    it('should reject invalid OTP code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@gmail.com',
          code: '999999',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid or expired OTP');
    });

    it('should reject expired OTP code', async () => {
      // Create expired OTP
      const expiredOtp = otpRepository.create({
        userId: user.id,
        code: '654321',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        isUsed: false,
      });
      await otpRepository.save(expiredOtp);

      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@gmail.com',
          code: '654321',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid or expired OTP');
    });

    it('should reject already used OTP code', async () => {
      // Mark OTP as used
      validOtpCode.isUsed = true;
      await otpRepository.save(validOtpCode);

      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@gmail.com',
          code: '123456',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid or expired OTP');
    });

    it('should reject OTP for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'nonexistent@gmail.com',
          code: '123456',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/refresh', () => {
    let user: User;
    let validRefreshToken: string;

    beforeEach(async () => {
      // Setup verified user
      user = userRepository.create({ 
        email: 'test@gmail.com', 
        isVerified: true 
      });
      await userRepository.save(user);

      // Generate a valid refresh token
      const jwtService = app.get('JwtService');
      validRefreshToken = jwtService.sign(
        { email: user.email, sub: user.id },
        { 
          secret: 'test-secret',
          expiresIn: '7d' 
        }
      );
    });

    it('should successfully refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: user.id,
          email: 'test@gmail.com',
          isVerified: true,
        },
      });

      // Tokens should be different from the original
      expect(response.body.refreshToken).not.toBe(validRefreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should reject refresh token for non-existent user', async () => {
      const jwtService = app.get('JwtService');
      const tokenForNonExistentUser = jwtService.sign(
        { email: 'nonexistent@gmail.com', sub: 'non-existent-id' },
        { 
          secret: 'test-secret',
          expiresIn: '7d' 
        }
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokenForNonExistentUser })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should handle missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('refreshToken');
    });
  });

  describe('End-to-end auth flow', () => {
    it('should complete full authentication flow', async () => {
      const email = 'e2e-test@gmail.com';

      // Step 1: Request OTP
      await request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({ email })
        .expect(201);

      // Get the OTP code from database (in real app, this would be sent via email)
      const user = await userRepository.findOne({ where: { email } });
      const otpCode = await otpRepository.findOne({ 
        where: { userId: user!.id, isUsed: false } 
      });

      // Step 2: Verify OTP
      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email,
          code: otpCode!.code,
        })
        .expect(201);

      const { accessToken, refreshToken } = verifyResponse.body;

      // Step 3: Use access token to access protected route (if such route exists)
      // This would test JWT auth guard integration

      // Step 4: Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(refreshResponse.body.accessToken).not.toBe(accessToken);
      expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);
    });
  });
});