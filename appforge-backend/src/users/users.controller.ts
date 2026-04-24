import { Controller, Get, Put, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put('me')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Put('me/password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  @Post('me/request-deletion')
  requestDeletion(@Request() req: any, @Body() body: { password: string }) {
    return this.usersService.requestDeletion(req.user.userId, body.password);
  }
}
