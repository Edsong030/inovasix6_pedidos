import {
  IsBoolean, IsNumber, IsOptional,
  IsString, Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * DTO de atualização parcial de produto.
 * Todos os campos são opcionais.
 * imageUrl e videoUrl aceitam null para limpar o valor no banco.
 */
export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ nullable: true, description: 'null remove a imagem' })
  @IsOptional()
  // Aceita string ou null. String vazia é normalizada para null.
  @Transform(({ value }) => (value === '' ? null : value))
  imageUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'null remove o vídeo' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  videoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
