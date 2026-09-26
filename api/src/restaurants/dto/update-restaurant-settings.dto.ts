import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class UpdateRestaurantSettingsDto {
  @ApiPropertyOptional({ enum: BusinessType, description: 'Restaurante, Lanchonete, Confeitaria ou Japonês' })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;
}
