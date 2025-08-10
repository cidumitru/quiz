import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from './auth/email.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('test-email')
  async testEmail(@Body() body: { email: string }) {
    try {
      await this.emailService.sendOtpEmail(body.email, '123456');
      return { 
        success: true, 
        message: `Test email sent successfully to ${body.email}` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to send test email', 
        error: error.message 
      };
    }
  }
}
