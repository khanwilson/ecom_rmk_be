import { handleError } from '@ecom-rmk/libs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAddressDto } from 'modules/user/dto/create-address.dto';
import { UpdateAddressDto } from 'modules/user/dto/update-address.dto';
import { UpdatePreferenceDto } from 'modules/user/dto/update-preference.dto';
import { UpdateProfileDto } from 'modules/user/dto/update-profile.dto';
import { prisma } from 'prisma/prisma';

@Injectable()
export class UserService {
  // constructor(private readonly redisService: RedisService) {}

  /**
   * Get or create user by identityId
   */
  private async getOrCreateUser(identityId: string) {
    let user = await prisma.user.findUnique({
      where: { identityId },
      include: {
        addresses: true,
        preferences: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { identityId },
        include: {
          addresses: true,
          preferences: true,
        },
      });
    }

    return user;
  }

  /**
   * Get user profile
   */
  async getProfile(identityId: string) {
    try {
      const user = await this.getOrCreateUser(identityId);
      const { addresses, preferences, ...profile } = user;
      return profile;
    } catch (error) {
      throw handleError(error, 'Failed to get user profile');
    }
  }

  /**
   * Update user profile (partial update)
   */
  async updateProfile(identityId: string, dto: UpdateProfileDto) {
    try {
      await this.getOrCreateUser(identityId);

      const updateData: any = {};
      if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
      if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
      if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
      if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
      if (dto.birthday !== undefined) updateData.birthday = new Date(dto.birthday);
      if (dto.gender !== undefined) updateData.gender = dto.gender;

      const updatedUser = await prisma.user.update({
        where: { identityId },
        data: updateData,
      });

      return updatedUser;
    } catch (error) {
      throw handleError(error, 'Failed to update user profile');
    }
  }

  /**
   * Get all addresses for user
   */
  async getAddresses(identityId: string) {
    try {
      const user = await this.getOrCreateUser(identityId);
      return user.addresses;
    } catch (error) {
      throw handleError(error, 'Failed to get addresses');
    }
  }

  /**
   * Get single address by ID
   */
  async getAddress(identityId: string, addressId: string) {
    try {
      const user = await this.getOrCreateUser(identityId);
      const address = user.addresses.find((addr) => addr.id === addressId);

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      return address;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw handleError(error, 'Failed to get address');
    }
  }

  /**
   * Create new address
   */
  async createAddress(identityId: string, dto: CreateAddressDto) {
    try {
      const user = await this.getOrCreateUser(identityId);

      // If this is set as default, unset other default addresses
      if (dto.isDefault) {
        await prisma.userAddress.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const address = await prisma.userAddress.create({
        data: {
          userId: user.id,
          label: dto.label,
          fullName: dto.fullName,
          phoneNumber: dto.phoneNumber,
          address: dto.address,
          ward: dto.ward,
          district: dto.district,
          province: dto.province,
          postalCode: dto.postalCode,
          isDefault: dto.isDefault || false,
        },
      });

      return address;
    } catch (error) {
      throw handleError(error, 'Failed to create address');
    }
  }

  /**
   * Update address (partial update)
   */
  async updateAddress(identityId: string, addressId: string, dto: UpdateAddressDto) {
    try {
      const user = await this.getOrCreateUser(identityId);
      const address = await prisma.userAddress.findFirst({
        where: { id: addressId, userId: user.id },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      // If setting as default, unset other default addresses
      if (dto.isDefault === true) {
        await prisma.userAddress.updateMany({
          where: { userId: user.id, id: { not: addressId }, isDefault: true },
          data: { isDefault: false },
        });
      }

      const updateData: any = {};
      if (dto.label !== undefined) updateData.label = dto.label;
      if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
      if (dto.phoneNumber !== undefined) updateData.phoneNumber = dto.phoneNumber;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.ward !== undefined) updateData.ward = dto.ward;
      if (dto.district !== undefined) updateData.district = dto.district;
      if (dto.province !== undefined) updateData.province = dto.province;
      if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
      if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;

      const updatedAddress = await prisma.userAddress.update({
        where: { id: addressId },
        data: updateData,
      });

      return updatedAddress;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw handleError(error, 'Failed to update address');
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(identityId: string, addressId: string) {
    try {
      const user = await this.getOrCreateUser(identityId);
      const address = await prisma.userAddress.findFirst({
        where: { id: addressId, userId: user.id },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }

      await prisma.userAddress.delete({
        where: { id: addressId },
      });

      return { message: 'Address deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw handleError(error, 'Failed to delete address');
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(identityId: string) {
    try {
      const user = await this.getOrCreateUser(identityId);
      return user.preferences;
    } catch (error) {
      throw handleError(error, 'Failed to get preferences');
    }
  }

  /**
   * Update user preferences (partial update)
   */
  async updatePreferences(identityId: string, dto: UpdatePreferenceDto) {
    try {
      const user = await this.getOrCreateUser(identityId);

      const updateData: any = {};
      if (dto.language !== undefined) updateData.language = dto.language;
      if (dto.currency !== undefined) updateData.currency = dto.currency;
      if (dto.emailNotifications !== undefined)
        updateData.emailNotifications = dto.emailNotifications;
      if (dto.smsNotifications !== undefined) updateData.smsNotifications = dto.smsNotifications;
      if (dto.pushNotifications !== undefined) updateData.pushNotifications = dto.pushNotifications;

      let preferences: any;
      if (user.preferences) {
        preferences = await prisma.userPreference.update({
          where: { userId: user.id },
          data: updateData,
        });
      } else {
        preferences = await prisma.userPreference.create({
          data: {
            userId: user.id,
            ...updateData,
          },
        });
      }

      return preferences;
    } catch (error) {
      throw handleError(error, 'Failed to update preferences');
    }
  }
}
