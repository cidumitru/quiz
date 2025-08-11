import {Controller, Delete, Get, Request, UseGuards} from '@nestjs/common';
import {UserService} from './user.service';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {DeleteUserResponse, UserProfileResponse} from '@aqb/data-access';
import {AuthenticatedRequest} from '../types/common.types';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserProfileResponse> {
    const user = await this.userService.findById(req.user.id);
    const { otpCodes, ...userProfile } = user;
    return {
      ...userProfile,
      createdAt: userProfile.createdAt.toString(),
      updatedAt: userProfile.updatedAt.toISOString()
    };
  }

  @Delete('profile')
  async deleteProfile(@Request() req: AuthenticatedRequest): Promise<DeleteUserResponse> {
    await this.userService.deleteUser(req.user.id);
    return { message: 'User account deleted successfully' };
  }
}
