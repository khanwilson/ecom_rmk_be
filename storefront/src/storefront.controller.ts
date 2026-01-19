import type { JwtPayload } from '@ecom-rmk/libs/auth';
import { CurrentUser, JwtAuthGuard } from '@ecom-rmk/libs/auth';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AddProductDto,
  CreateCategoryDto,
  RegisterStorefrontDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateSettingsDto,
  UpdateStorefrontDto,
} from 'modules/storefront/dto';
import { StorefrontService } from './storefront.service';

@ApiTags('storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  // ==================== STOREFRONT MANAGEMENT ====================

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Register as KOL (create storefront)',
    description: 'Create a new storefront for the authenticated user. User becomes a KOL.',
  })
  async registerStorefront(@CurrentUser() user: JwtPayload, @Body() dto: RegisterStorefrontDto) {
    // No ownership check needed - creating new storefront
    return this.storefrontService.registerStorefront(user.sub, dto);
  }

  @Get('my-storefront')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: "Get current user's storefront",
    description: 'Get storefront details including categories, products, and settings.',
  })
  async getMyStorefront(@CurrentUser() user: JwtPayload) {
    return this.storefrontService.getMyStorefront(user);
  }

  @Patch('my-storefront')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: "Update current user's storefront",
    description: 'Update storefront name, description, logo, cover image, or commission rate.',
  })
  async updateMyStorefront(@CurrentUser() user: JwtPayload, @Body() dto: UpdateStorefrontDto) {
    return this.storefrontService.updateMyStorefront(user, dto);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get storefront by slug (public)',
    description: 'Get public storefront information by slug. No authentication required.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Storefront slug',
    example: 'my-awesome-storefront',
  })
  async getStorefrontBySlug(@Param('slug') slug: string) {
    // Public endpoint - no authorization needed
    return this.storefrontService.getStorefrontBySlug(slug);
  }

  // ==================== CATEGORY MANAGEMENT ====================

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Create category',
    description: 'Create a new product category for your storefront.',
  })
  async createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.storefrontService.createCategory(user, dto);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'List all categories of my storefront',
    description: 'Get all categories including nested structure.',
  })
  async getCategories(@CurrentUser() user: JwtPayload) {
    return this.storefrontService.getCategories(user);
  }

  @Get('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Get single category details including children and parent.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (MongoDB ObjectId)' })
  async getCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.storefrontService.getCategory(user, id);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Update category',
    description: 'Update category name, description, image, or parent.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (MongoDB ObjectId)' })
  async updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.storefrontService.updateCategory(user, id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Delete category',
    description: 'Delete a category. Cannot delete if it has subcategories or products.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (MongoDB ObjectId)' })
  async deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.storefrontService.deleteCategory(user, id);
  }

  // ==================== SETTINGS MANAGEMENT ====================

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Get storefront settings',
    description: 'Get all storefront settings including social links, bio, and preferences.',
  })
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.storefrontService.getSettings(user);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Update storefront settings',
    description: 'Update storefront settings like social links, bio, commission preferences.',
  })
  async updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.storefrontService.updateSettings(user, dto);
  }

  // ==================== PRODUCT MANAGEMENT ====================

  @Post('products')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Add product to storefront',
    description: 'Add a product from a shop to your storefront for affiliate selling.',
  })
  async addProduct(@CurrentUser() user: JwtPayload, @Body() dto: AddProductDto) {
    return this.storefrontService.addProduct(user, dto);
  }

  @Get('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'List all products in my storefront',
    description: 'Get all products added to your storefront.',
  })
  async getProducts(@CurrentUser() user: JwtPayload) {
    return this.storefrontService.getProducts(user);
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Get storefront product by ID',
    description: 'Get single product details from your storefront.',
  })
  @ApiParam({
    name: 'id',
    description: 'Storefront Product ID (MongoDB ObjectId)',
  })
  async getProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.storefrontService.getProduct(user, id);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Update storefront product',
    description: 'Update product custom title, description, image, or commission rate.',
  })
  @ApiParam({
    name: 'id',
    description: 'Storefront Product ID (MongoDB ObjectId)',
  })
  async updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.storefrontService.updateProduct(user, id, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Remove product from storefront',
    description: 'Remove a product from your storefront.',
  })
  @ApiParam({
    name: 'id',
    description: 'Storefront Product ID (MongoDB ObjectId)',
  })
  async removeProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.storefrontService.removeProduct(user, id);
  }

  // ==================== HEALTH CHECK ====================

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHello(): string {
    return this.storefrontService.getHello();
  }
}
