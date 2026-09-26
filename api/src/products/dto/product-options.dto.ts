import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber,
  IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SaleUnit } from '@prisma/client';

/** Adicional pago de um produto (ex.: "Bacon extra", "Molho extra"). */
export class ProductAddonDto {
  @ApiProperty({ example: 'bacon-extra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  id: string;

  @ApiProperty({ example: 'Bacon extra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;
}

/**
 * Campos de venda comuns a criação e edição de produto:
 * unidade, encomenda, adicionais e observações sugeridas.
 */
export class ProductSaleOptionsDto {
  @ApiPropertyOptional({ enum: SaleUnit, default: SaleUnit.UNIT })
  @IsOptional()
  @IsEnum(SaleUnit)
  saleUnit?: SaleUnit;

  @ApiPropertyOptional({ default: false, description: 'Produto feito sob encomenda' })
  @IsOptional()
  @IsBoolean()
  madeToOrder?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Antecedência mínima da encomenda, em horas' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  minLeadTimeHours?: number | null;

  @ApiPropertyOptional({ type: [ProductAddonDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductAddonDto)
  addons?: ProductAddonDto[];

  @ApiPropertyOptional({ type: [String], example: ['Sem cebola', 'Ponto: mal passado'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  observationOptions?: string[];
}
