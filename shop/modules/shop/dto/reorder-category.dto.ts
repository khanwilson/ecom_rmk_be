import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ReorderCategoryDto {
  @ApiProperty({
    example: 2,
    description: 'New order position for the category',
    minimum: 0,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  order: number;
}
