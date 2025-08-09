import { Controller, Get, UseGuards, Request, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req): Promise<Omit<User, 'otpCodes'>> {
    const user = await this.userService.findById(req.user.id);
    const { otpCodes, ...userProfile } = user;
    return userProfile;
  }

  @Delete('profile')
  async deleteProfile(@Request() req): Promise<{ message: string }> {
    await this.userService.deleteUser(req.user.id);
    return { message: 'User account deleted successfully' };
  }
}