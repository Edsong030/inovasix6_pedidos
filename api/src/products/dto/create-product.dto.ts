import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

import { ProductSaleOptionsDto } from './product-options.dto';

export class CreateProductDto extends ProductSaleOptionsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ nullable: true, description: 'null remove a imagem' })
  @IsOptional()
  @IsString()
  // Aceita string, null ou undefined. String vazia é convertida para null.
  @Transform(({ value }) => (value === '' ? null : value))
  imageUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'URL de video curto opcional. null remove o video.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? null : value))
  videoUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
