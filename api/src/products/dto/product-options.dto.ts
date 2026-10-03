import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber,
  IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SaleUnit } from '@prisma/client';

/** Opção de um grupo (ex.: "Bacon" em "Adicionais", "Médio" em "Tamanho"). */
export class ProductOptionDto {
  @ApiProperty({ example: 'bacon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  id: string;

  @ApiProperty({ example: 'Bacon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 5, description: 'Acréscimo no preço do item (0 para opções sem custo)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

/** Grupo de opções configurável (sem regras fixas por tipo de negócio). */
export class ProductOptionGroupDto {
  @ApiProperty({ example: 'adicionais' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  id: string;

  @ApiProperty({ example: 'Adicionais' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ description: 'Obrigatório escolher' })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: 'Mínimo de escolhas' })
  @IsInt()
  @Min(0)
  @Max(30)
  min: number;

  @ApiProperty({ description: 'Máximo de escolhas (escolha única = 1)' })
  @IsInt()
  @Min(1)
  @Max(30)
  max: number;

  @ApiProperty({ description: 'false = escolha única; true = múltipla' })
  @IsBoolean()
  multiple: boolean;

  @ApiProperty({ type: [ProductOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options: ProductOptionDto[];
}

/**
 * Campos de venda comuns a criação e edição de produto:
 * unidade, encomenda, grupos de opções e observações sugeridas.
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

  @ApiPropertyOptional({ type: [ProductOptionGroupDto], description: 'Grupos de opções (Tamanho, Adicionais, Remover ingredientes…)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionGroupDto)
  optionGroups?: ProductOptionGroupDto[];

  @ApiPropertyOptional({ type: [String], example: ['Sem cebola', 'Ponto: mal passado'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  observationOptions?: string[];
}
