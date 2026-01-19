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
  CreateCategoryDto,
  RegisterShopDto,
  ReorderCategoryDto,
  SubmitVerificationDto,
  UpdateCategoryDto,
  UpdateSettingsDto,
  UpdateShopDto,
} from 'modules/shop/dto';
import { ShopService } from './shop.service';
@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // ==================== SHOP MANAGEMENT ====================

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Register as Seller (create shop)',
    description: 'Create a new shop for the authenticated user. User becomes a Seller.',
  })
  async registerShop(@CurrentUser() user: JwtPayload, @Body() dto: RegisterShopDto) {
    // No ownership check needed - creating new shop
    return this.shopService.registerShop(user.sub, dto);
  }

  @Get('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: "Get current user's shop",
    description: 'Get shop details including categories, settings, and verification status.',
  })
  async getMyShop(@CurrentUser() user: JwtPayload) {
    return this.shopService.getMyShop(user);
  }

  @Patch('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: "Update current user's shop",
    description: 'Update shop name, description, logo, or cover image.',
  })
  async updateMyShop(@CurrentUser() user: JwtPayload, @Body() dto: UpdateShopDto) {
    return this.shopService.updateMyShop(user, dto);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get shop by slug (public)',
    description: 'Get public shop information by slug. No authentication required.',
  })
  @ApiParam({ name: 'slug', description: 'Shop slug', example: 'my-awesome-shop' })
  async getShopBySlug(@Param('slug') slug: string) {
    // Public endpoint - no authorization needed
    return this.shopService.getShopBySlug(slug);
  }

  // ==================== CATEGORY MANAGEMENT ====================

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Create category',
    description: 'Create a new product category for your shop.',
  })
  async createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.shopService.createCategory(user, dto);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'List all categories of my shop',
    description: 'Get all categories including nested structure.',
  })
  async getCategories(@CurrentUser() user: JwtPayload) {
    return this.shopService.getCategories(user);
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
    return this.shopService.getCategory(user, id);
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
    return this.shopService.updateCategory(user, id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Delete category',
    description: 'Delete a category. Cannot delete if it has subcategories.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (MongoDB ObjectId)' })
  async deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.shopService.deleteCategory(user, id);
  }

  @Patch('categories/:id/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Reorder category',
    description: 'Change the display order of a category.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (MongoDB ObjectId)' })
  async reorderCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReorderCategoryDto
  ) {
    return this.shopService.reorderCategory(user, id, dto);
  }

  // ==================== SETTINGS MANAGEMENT ====================

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Get shop settings',
    description: 'Get all shop settings including policies and thresholds.',
  })
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.shopService.getSettings(user);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Update shop settings',
    description: 'Update shop settings like auto-accept orders, policies, etc.',
  })
  async updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.shopService.updateSettings(user, dto);
  }

  // ==================== VERIFICATION MANAGEMENT ====================

  @Get('verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Get verification status',
    description: 'Get current verification status and submitted documents.',
  })
  async getVerification(@CurrentUser() user: JwtPayload) {
    return this.shopService.getVerification(user);
  }

  @Post('verification/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    summary: 'Submit verification documents',
    description: 'Submit documents for shop verification review.',
  })
  async submitVerification(@CurrentUser() user: JwtPayload, @Body() dto: SubmitVerificationDto) {
    return this.shopService.submitVerification(user, dto);
  }

  // ==================== HEALTH CHECK ====================

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHello(): string {
    return this.shopService.getHello();
  }
}
