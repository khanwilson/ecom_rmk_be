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
import { StorefrontStatus } from 'generated/prisma/enums';
import { StorefrontCreateInput } from 'generated/prisma/models';
import {
  AddProductDto,
  CreateCategoryDto,
  RegisterStorefrontDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateSettingsDto,
  UpdateStorefrontDto,
} from 'modules/storefront/dto';
import { prisma } from 'prisma/prisma';

@Injectable()
export class StorefrontService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICES.STOREFRONT_SERVICE)
    private readonly storefrontClient: ClientKafka
  ) {}

  async onModuleInit() {
    // Initialize any required setup
  }

  getHello(): string {
    return 'Hello from Storefront Service!';
  }

  // ==================== STOREFRONT MANAGEMENT ====================

  /**
   * Create storefront from Kafka event (triggered by Identity service when user registers as KOL)
   * This is called internally, not from REST API
   */
  async createStorefrontFromEvent(data: StorefrontCreateInput) {
    // Check if user already has a storefront (shouldn't happen, but safety check)
    const existingStorefront = await prisma.storefront.findUnique({
      where: { ownerId: data.ownerId },
    });

    if (existingStorefront) {
      console.log('[StorefrontService] Storefront already exists for owner:', data.ownerId);
      return existingStorefront;
    }

    // Generate unique slug from storefront name
    const slug = await this.generateUniqueSlug(data.name);

    // Create storefront with default settings
    const storefront = await prisma.storefront.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        slug,
        description: data.description,
        logo: data.logo,
        coverImage: data.coverImage,
        commissionRate: data.commissionRate ?? 0,
        status: StorefrontStatus.PENDING_VERIFICATION,
        settings: {
          create: {
            showEarnings: false,
            autoAcceptProducts: false,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    console.log('[StorefrontService] Storefront created from event:', storefront.id);

    return storefront;
  }

  /**
   * Register a new storefront for the current user (become a KOL)
   * @deprecated Use Identity service's register-kol API instead
   */
  async registerStorefront(ownerId: string, dto: RegisterStorefrontDto) {
    // Check if user already has a storefront
    const existingStorefront = await prisma.storefront.findUnique({
      where: { ownerId },
    });

    if (existingStorefront) {
      throw new ConflictException('User already has a storefront');
    }

    // Generate unique slug from storefront name
    const slug = await this.generateUniqueSlug(dto.name);

    // Create storefront with default settings
    const storefront = await prisma.storefront.create({
      data: {
        ownerId,
        name: dto.name,
        slug,
        description: dto.description,
        logo: dto.logo,
        coverImage: dto.coverImage,
        commissionRate: dto.commissionRate ?? 0,
        status: StorefrontStatus.PENDING_VERIFICATION,
        settings: {
          create: {
            showEarnings: false,
            autoAcceptProducts: false,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    return storefront;
  }

  /**
   * Get current user's storefront
   */
  async getMyStorefront(user: JwtPayload) {
    // Verify ownership or admin access
    const baseStorefront = await this.getStorefrontByOwnerId(user);

    // Fetch full storefront with relations
    const storefront = await prisma.storefront.findUnique({
      where: { id: baseStorefront.id },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        products: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        settings: true,
      },
    });

    return storefront;
  }

  /**
   * Update current user's storefront
   */
  async updateMyStorefront(user: JwtPayload, dto: UpdateStorefrontDto) {
    // Verify ownership or admin access
    const storefront = await this.getStorefrontByOwnerId(user);

    // If name is being updated, generate new slug
    let slug = storefront.slug;
    if (dto.name && dto.name !== storefront.name) {
      slug = await this.generateUniqueSlug(dto.name, storefront.id);
    }

    const updatedStorefront = await prisma.storefront.update({
      where: { id: storefront.id },
      data: {
        ...dto,
        slug,
      },
      include: {
        settings: true,
      },
    });

    // Emit Kafka event for storefront.updated
    this.storefrontClient.emit(KAFKA_TOPICS.STOREFRONT_UPDATED, {
      storefrontId: updatedStorefront.id,
      ownerId: updatedStorefront.ownerId,
      name: updatedStorefront.name,
      slug: updatedStorefront.slug,
      updatedAt: updatedStorefront.updatedAt,
    });

    return updatedStorefront;
  }

  /**
   * Get storefront by slug (public)
   */
  async getStorefrontBySlug(slug: string) {
    const storefront = await prisma.storefront.findUnique({
      where: { slug },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        products: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!storefront || storefront.deletedAt) {
      throw new NotFoundException('Storefront not found');
    }

    // Don't expose sensitive info for public API
    const { settings: _settings, ...publicStorefront } = storefront as typeof storefront & {
      settings?: unknown;
    };

    return publicStorefront;
  }

  // ==================== CATEGORY MANAGEMENT ====================

  /**
   * Create a new category for the storefront
   */
  async createCategory(user: JwtPayload, dto: CreateCategoryDto) {
    const storefront = await this.getStorefrontByOwnerId(user);

    // Generate unique slug for category within storefront
    const slug = await this.generateUniqueCategorySlug(storefront.id, dto.name);

    // Validate parent category if provided
    if (dto.parentId) {
      await this.validateParentCategory(storefront.id, dto.parentId);
    }

    const category = await prisma.storefrontCategory.create({
      data: {
        storefrontId: storefront.id,
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
   * Get all categories of current user's storefront
   */
  async getCategories(user: JwtPayload) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const categories = await prisma.storefrontCategory.findMany({
      where: { storefrontId: storefront.id },
      orderBy: { order: 'asc' },
      include: {
        children: {
          orderBy: { order: 'asc' },
        },
        products: true,
      },
    });

    // Build hierarchical structure (return only root categories with nested children)
    return categories.filter((cat) => !cat.parentId);
  }

  /**
   * Get single category by ID
   */
  async getCategory(user: JwtPayload, categoryId: string) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const category = await prisma.storefrontCategory.findFirst({
      where: {
        id: categoryId,
        storefrontId: storefront.id,
      },
      include: {
        children: {
          orderBy: { order: 'asc' },
        },
        parent: true,
        products: true,
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
    const storefront = await this.getStorefrontByOwnerId(user);

    const category = await prisma.storefrontCategory.findFirst({
      where: {
        id: categoryId,
        storefrontId: storefront.id,
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
        await this.validateParentCategory(storefront.id, dto.parentId, categoryId);
      }
    }

    // Generate new slug if name is being updated
    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = await this.generateUniqueCategorySlug(storefront.id, dto.name, category.id);
    }

    const updatedCategory = await prisma.storefrontCategory.update({
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
    const storefront = await this.getStorefrontByOwnerId(user);

    const category = await prisma.storefrontCategory.findFirst({
      where: {
        id: categoryId,
        storefrontId: storefront.id,
      },
      include: {
        children: true,
        products: true,
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

    // Check if category has products
    if (category.products.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with products. Please remove products first.'
      );
    }

    await prisma.storefrontCategory.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }

  // ==================== SETTINGS MANAGEMENT ====================

  /**
   * Get storefront settings
   */
  async getSettings(user: JwtPayload) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const settings = await prisma.storefrontSettings.findUnique({
      where: { storefrontId: storefront.id },
    });

    if (!settings) {
      // Create default settings if not exists
      return prisma.storefrontSettings.create({
        data: {
          storefrontId: storefront.id,
          showEarnings: false,
          autoAcceptProducts: false,
        },
      });
    }

    return settings;
  }

  /**
   * Update storefront settings
   */
  async updateSettings(user: JwtPayload, dto: UpdateSettingsDto) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const data = {
      socialLinks: dto.socialLinks ? { ...dto.socialLinks } : undefined,
      bio: dto.bio,
      showEarnings: dto.showEarnings,
      autoAcceptProducts: dto.autoAcceptProducts,
      minCommissionRate: dto.minCommissionRate,
    };

    const settings = await prisma.storefrontSettings.upsert({
      where: { storefrontId: storefront.id },
      update: data,
      create: {
        storefrontId: storefront.id,
        ...data,
      },
    });

    return settings;
  }

  // ==================== PRODUCT MANAGEMENT ====================

  /**
   * Add product to storefront
   */
  async addProduct(user: JwtPayload, dto: AddProductDto) {
    const storefront = await this.getStorefrontByOwnerId(user);

    // Check if product already exists in storefront
    const existingProduct = await prisma.storefrontProduct.findUnique({
      where: {
        storefrontId_productId: {
          storefrontId: storefront.id,
          productId: dto.productId,
        },
      },
    });

    if (existingProduct) {
      throw new ConflictException('Product already exists in storefront');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await prisma.storefrontCategory.findFirst({
        where: {
          id: dto.categoryId,
          storefrontId: storefront.id,
        },
      });

      if (!category) {
        throw new BadRequestException('Category not found in this storefront');
      }
    }

    // TODO: Validate productId and shopId with Product and Shop services via Kafka

    const product = await prisma.storefrontProduct.create({
      data: {
        storefrontId: storefront.id,
        productId: dto.productId,
        shopId: dto.shopId,
        categoryId: dto.categoryId,
        customTitle: dto.customTitle,
        customDescription: dto.customDescription,
        customImage: dto.customImage,
        commissionRate: dto.commissionRate,
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });

    return product;
  }

  /**
   * Get all products of current user's storefront
   */
  async getProducts(user: JwtPayload) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const products = await prisma.storefrontProduct.findMany({
      where: { storefrontId: storefront.id },
      orderBy: { order: 'asc' },
      include: {
        category: true,
      },
    });

    return products;
  }

  /**
   * Get single product by ID
   */
  async getProduct(user: JwtPayload, productId: string) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const product = await prisma.storefrontProduct.findFirst({
      where: {
        id: productId,
        storefrontId: storefront.id,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in storefront');
    }

    return product;
  }

  /**
   * Update storefront product
   */
  async updateProduct(user: JwtPayload, productId: string, dto: UpdateProductDto) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const product = await prisma.storefrontProduct.findFirst({
      where: {
        id: productId,
        storefrontId: storefront.id,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in storefront');
    }

    // Validate category if being changed
    if (dto.categoryId) {
      const category = await prisma.storefrontCategory.findFirst({
        where: {
          id: dto.categoryId,
          storefrontId: storefront.id,
        },
      });

      if (!category) {
        throw new BadRequestException('Category not found in this storefront');
      }
    }

    const updatedProduct = await prisma.storefrontProduct.update({
      where: { id: productId },
      data: dto,
      include: {
        category: true,
      },
    });

    return updatedProduct;
  }

  /**
   * Remove product from storefront
   */
  async removeProduct(user: JwtPayload, productId: string) {
    const storefront = await this.getStorefrontByOwnerId(user);

    const product = await prisma.storefrontProduct.findFirst({
      where: {
        id: productId,
        storefrontId: storefront.id,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in storefront');
    }

    await prisma.storefrontProduct.delete({
      where: { id: productId },
    });

    return { message: 'Product removed from storefront successfully' };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get storefront by owner ID with authorization check
   * - ADMIN can access any storefront (if storefrontId provided) or will get error if no storefrontId
   * - Non-ADMIN must own the storefront
   */
  private async getStorefrontByOwnerId(user: JwtPayload) {
    // For non-admin users, verify ownership
    const storefront = await prisma.storefront.findUnique({
      where: { ownerId: user.sub },
    });

    if (!storefront) {
      // If admin, provide clearer message
      if (user.roles.includes(Role.ADMIN)) {
        throw new NotFoundException('Storefront not found for this user.');
      }
      throw new ForbiddenException('You do not have a storefront. Please register first.');
    }

    return storefront;
  }

  /**
   * Generate unique slug from name
   */
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.storefront.findUnique({
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
   * Generate unique category slug within a storefront
   */
  private async generateUniqueCategorySlug(
    storefrontId: string,
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.storefrontCategory.findFirst({
        where: {
          storefrontId,
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
    storefrontId: string,
    parentId: string,
    currentCategoryId?: string
  ): Promise<void> {
    const parent = await prisma.storefrontCategory.findFirst({
      where: {
        id: parentId,
        storefrontId,
      },
    });

    if (!parent) {
      throw new BadRequestException(
        'Parent category not found or does not belong to this storefront'
      );
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

    const children = await prisma.storefrontCategory.findMany({
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
