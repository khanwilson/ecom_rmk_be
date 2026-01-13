import { type JwtPayload, Role } from '@ecom-rmk/libs/auth';
import { KAFKA_SERVICES, KAFKA_TOPICS } from '@ecom-rmk/libs/kafka';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ShopStatus } from 'generated/prisma/enums';
import {
  CreateCategoryDto,
  RegisterShopDto,
  ReorderCategoryDto,
  SubmitVerificationDto,
  UpdateCategoryDto,
  UpdateSettingsDto,
  UpdateShopDto,
} from 'modules/shop/dto';
import { prisma } from 'prisma/prisma';

@Injectable()
export class ShopService implements OnModuleInit {
  constructor(@Inject(KAFKA_SERVICES.SHOP_SERVICE) private readonly shopClient: ClientKafka) {}

  async onModuleInit() {
    // Initialize any required setup
  }

  getHello(): string {
    return 'Hello from Shop Service!';
  }

  // ==================== SHOP MANAGEMENT ====================

  /**
   * Register a new shop for the current user (become a Seller)
   */
  async registerShop(ownerId: string, dto: RegisterShopDto) {
    // Check if user already has a shop
    const existingShop = await prisma.shop.findUnique({
      where: { ownerId },
    });

    if (existingShop) {
      throw new ConflictException('User already has a shop');
    }

    // Generate unique slug from shop name
    const slug = await this.generateUniqueSlug(dto.name);

    // Create shop with default settings and verification
    const shop = await prisma.shop.create({
      data: {
        ownerId,
        name: dto.name,
        slug,
        description: dto.description,
        logo: dto.logo,
        coverImage: dto.coverImage,
        status: ShopStatus.PENDING_VERIFICATION,
        settings: {
          create: {
            autoAcceptOrder: false,
          },
        },
        verification: {
          create: {
            isVerified: false,
          },
        },
      },
      include: {
        settings: true,
        verification: true,
      },
    });

    // Emit Kafka event for shop.created to notify Identity service to add SELLER role
    this.shopClient.emit(KAFKA_TOPICS.SHOP_CREATED, {
      shopId: shop.id,
      ownerId: shop.ownerId,
      name: shop.name,
      slug: shop.slug,
      createdAt: shop.createdAt,
    });

    return shop;
  }

  /**
   * Get current user's shop
   */
  async getMyShop(user: JwtPayload) {
    // Verify ownership or admin access
    const baseShop = await this.getShopByOwnerId(user);

    // Fetch full shop with relations
    const shop = await prisma.shop.findUnique({
      where: { id: baseShop.id },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        settings: true,
        verification: true,
      },
    });

    return shop;
  }

  /**
   * Update current user's shop
   */
  async updateMyShop(user: JwtPayload, dto: UpdateShopDto) {
    // Verify ownership or admin access
    const shop = await this.getShopByOwnerId(user);

    // If name is being updated, generate new slug
    let slug = shop.slug;
    if (dto.name && dto.name !== shop.name) {
      slug = await this.generateUniqueSlug(dto.name, shop.id);
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...dto,
        slug,
      },
      include: {
        settings: true,
        verification: true,
      },
    });

    // Emit Kafka event for shop.updated
    this.shopClient.emit(KAFKA_TOPICS.SHOP_UPDATED, {
      shopId: updatedShop.id,
      ownerId: updatedShop.ownerId,
      name: updatedShop.name,
      slug: updatedShop.slug,
      updatedAt: updatedShop.updatedAt,
    });

    return updatedShop;
  }

  /**
   * Get shop by slug (public)
   */
  async getShopBySlug(slug: string) {
    const shop = await prisma.shop.findUnique({
      where: { slug },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!shop || shop.deletedAt) {
      throw new NotFoundException('Shop not found');
    }

    // Don't expose sensitive info for public API
    const {
      settings: _settings,
      verification: _verification,
      ...publicShop
    } = shop as typeof shop & { settings?: unknown; verification?: unknown };

    return publicShop;
  }

  // ==================== CATEGORY MANAGEMENT ====================

  /**
   * Create a new category for the shop
   */
  async createCategory(user: JwtPayload, dto: CreateCategoryDto) {
    const shop = await this.getShopByOwnerId(user);

    // Generate unique slug for category within shop
    const slug = await this.generateUniqueCategorySlug(shop.id, dto.name);

    // Validate parent category if provided
    if (dto.parentId) {
      await this.validateParentCategory(shop.id, dto.parentId);
    }

    const category = await prisma.shopCategory.create({
      data: {
        shopId: shop.id,
        parentId: dto.parentId,
        name: dto.name,
        slug,
        description: dto.description,
        image: dto.image,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return category;
  }

  /**
   * Get all categories of current user's shop
   */
  async getCategories(user: JwtPayload) {
    const shop = await this.getShopByOwnerId(user);

    const categories = await prisma.shopCategory.findMany({
      where: { shopId: shop.id },
      orderBy: { order: 'asc' },
      include: {
        children: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Build hierarchical structure (return only root categories with nested children)
    return categories.filter((cat) => !cat.parentId);
  }

  /**
   * Get single category by ID
   */
  async getCategory(user: JwtPayload, categoryId: string) {
    const shop = await this.getShopByOwnerId(user);

    const category = await prisma.shopCategory.findFirst({
      where: {
        id: categoryId,
        shopId: shop.id,
      },
      include: {
        children: {
          orderBy: { order: 'asc' },
        },
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(user: JwtPayload, categoryId: string, dto: UpdateCategoryDto) {
    const shop = await this.getShopByOwnerId(user);

    const category = await prisma.shopCategory.findFirst({
      where: {
        id: categoryId,
        shopId: shop.id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Validate parent category if being changed
    if (dto.parentId !== undefined) {
      // Prevent setting itself as parent
      if (dto.parentId === categoryId) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      // Prevent circular reference
      if (dto.parentId) {
        await this.validateParentCategory(shop.id, dto.parentId, categoryId);
      }
    }

    // Generate new slug if name is being updated
    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = await this.generateUniqueCategorySlug(shop.id, dto.name, category.id);
    }

    const updatedCategory = await prisma.shopCategory.update({
      where: { id: categoryId },
      data: {
        ...dto,
        slug,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    return updatedCategory;
  }

  /**
   * Delete category
   */
  async deleteCategory(user: JwtPayload, categoryId: string) {
    const shop = await this.getShopByOwnerId(user);

    const category = await prisma.shopCategory.findFirst({
      where: {
        id: categoryId,
        shopId: shop.id,
      },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Please delete subcategories first.'
      );
    }

    // TODO: Check if category has products before deleting

    await prisma.shopCategory.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }

  /**
   * Reorder category
   */
  async reorderCategory(user: JwtPayload, categoryId: string, dto: ReorderCategoryDto) {
    const shop = await this.getShopByOwnerId(user);

    const category = await prisma.shopCategory.findFirst({
      where: {
        id: categoryId,
        shopId: shop.id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updatedCategory = await prisma.shopCategory.update({
      where: { id: categoryId },
      data: { order: dto.order },
    });

    return updatedCategory;
  }

  // ==================== SETTINGS MANAGEMENT ====================

  /**
   * Get shop settings
   */
  async getSettings(user: JwtPayload) {
    const shop = await this.getShopByOwnerId(user);

    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: shop.id },
    });

    if (!settings) {
      // Create default settings if not exists
      return prisma.shopSettings.create({
        data: {
          shopId: shop.id,
          autoAcceptOrder: false,
        },
      });
    }

    return settings;
  }

  /**
   * Update shop settings
   */
  async updateSettings(user: JwtPayload, dto: UpdateSettingsDto) {
    const shop = await this.getShopByOwnerId(user);

    const settings = await prisma.shopSettings.upsert({
      where: { shopId: shop.id },
      update: dto,
      create: {
        shopId: shop.id,
        ...dto,
      },
    });

    return settings;
  }

  // ==================== VERIFICATION MANAGEMENT ====================

  /**
   * Get verification status
   */
  async getVerification(user: JwtPayload) {
    const shop = await this.getShopByOwnerId(user);

    const verification = await prisma.shopVerification.findUnique({
      where: { shopId: shop.id },
    });

    if (!verification) {
      return {
        isVerified: false,
        message: 'No verification documents submitted',
      };
    }

    return verification;
  }

  /**
   * Submit verification documents
   */
  async submitVerification(user: JwtPayload, dto: SubmitVerificationDto) {
    const shop = await this.getShopByOwnerId(user);

    // Check if shop is already verified
    const existingVerification = await prisma.shopVerification.findUnique({
      where: { shopId: shop.id },
    });

    if (existingVerification?.isVerified) {
      throw new BadRequestException('Shop is already verified');
    }

    // Update verification with documents
    // Convert class instances to plain JSON objects for Prisma Json type
    const documentsJson = JSON.parse(JSON.stringify(dto.documents));

    const verification = await prisma.shopVerification.upsert({
      where: { shopId: shop.id },
      update: {
        documents: documentsJson,
        rejectionReason: null, // Clear previous rejection reason
      },
      create: {
        shopId: shop.id,
        documents: documentsJson,
        isVerified: false,
      },
    });

    // Update shop status to pending verification
    await prisma.shop.update({
      where: { id: shop.id },
      data: { status: ShopStatus.PENDING_VERIFICATION },
    });

    // Note: shop.verified event should be emitted when admin approves verification
    // For now, we just return the submission result

    return {
      message: 'Verification documents submitted successfully',
      verification,
    };
  }

  // ==================== HELPER METHODS ====================
  /**
   * Get shop by owner ID with authorization check
   * - ADMIN can access any shop (if shopId provided) or will get error if no shopId
   * - Non-ADMIN must own the shop
   */
  private async getShopByOwnerId(user: JwtPayload) {
    // For non-admin users, verify ownership
    const shop = await prisma.shop.findUnique({
      where: { ownerId: user.sub },
    });

    if (!shop) {
      // If admin, provide clearer message
      if (user.roles.includes(Role.ADMIN)) {
        throw new NotFoundException('Shop not found for this user.');
      }
      throw new ForbiddenException('You do not have a shop. Please register first.');
    }

    return shop;
  }

  /**
   * Generate unique slug from name
   */
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.shop.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === excludeId) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Generate unique category slug within a shop
   */
  private async generateUniqueCategorySlug(
    shopId: string,
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.shopCategory.findFirst({
        where: {
          shopId,
          slug,
          id: excludeId ? { not: excludeId } : undefined,
        },
      });

      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Slugify string
   */
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start
      .replace(/-+$/, ''); // Trim - from end
  }

  /**
   * Validate parent category (prevent circular references)
   */
  private async validateParentCategory(
    shopId: string,
    parentId: string,
    currentCategoryId?: string
  ): Promise<void> {
    const parent = await prisma.shopCategory.findFirst({
      where: {
        id: parentId,
        shopId,
      },
    });

    if (!parent) {
      throw new BadRequestException('Parent category not found or does not belong to this shop');
    }

    // If updating, check for circular reference
    if (currentCategoryId) {
      // Get all descendants of current category
      const descendants = await this.getAllDescendants(currentCategoryId);
      if (descendants.includes(parentId)) {
        throw new BadRequestException(
          'Cannot set a descendant category as parent (circular reference)'
        );
      }
    }
  }

  /**
   * Get all descendant category IDs
   */
  private async getAllDescendants(categoryId: string): Promise<string[]> {
    const descendants: string[] = [];

    const children = await prisma.shopCategory.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await this.getAllDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }
}
