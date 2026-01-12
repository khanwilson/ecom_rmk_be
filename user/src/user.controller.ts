import { CurrentUser, IdentityStatus, JwtAuthGuard, JwtPayload } from '@ecom-rmk/libs/auth';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAddressDto } from 'modules/user/dto/create-address.dto';
import { UpdateAddressDto } from 'modules/user/dto/update-address.dto';
import { UpdatePreferenceDto } from 'modules/user/dto/update-preference.dto';
import { UpdateProfileDto } from 'modules/user/dto/update-profile.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('accessToken')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Profile Management
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile (private)' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.getProfile(user.sub);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile (partial update, private)' })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.updateProfile(user.sub, dto);
  }

  /**
   * Address Management
   */
  @Get('addresses')
  @ApiOperation({ summary: 'Get all user addresses (private)' })
  async getAddresses(@CurrentUser() user: JwtPayload) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.getAddresses(user.sub);
  }

  @Get('addresses/:id')
  @ApiOperation({ summary: 'Get single address by ID (private)' })
  async getAddress(@CurrentUser() user: JwtPayload, @Param('id') addressId: string) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.getAddress(user.sub, addressId);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new address (private)' })
  async createAddress(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.createAddress(user.sub, dto);
  }

  @Patch('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update address (partial update, private)' })
  async updateAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto
  ) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.updateAddress(user.sub, addressId, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete address (private)' })
  async deleteAddress(@CurrentUser() user: JwtPayload, @Param('id') addressId: string) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.deleteAddress(user.sub, addressId);
  }

  /**
   * Preference Management
   */
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences (private)' })
  async getPreferences(@CurrentUser() user: JwtPayload) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.getPreferences(user.sub);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences (partial update, private)' })
  async updatePreferences(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePreferenceDto) {
    if (user.status !== IdentityStatus.AVAILABLE) {
      throw new ForbiddenException('User is not available');
    }
    return this.userService.updatePreferences(user.sub, dto);
  }
}
