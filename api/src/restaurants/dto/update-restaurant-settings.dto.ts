import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsOptional,
  IsString, Length, Matches, Max, MaxLength, Min, Validate, ValidateNested,
  ValidatorConstraint, type ValidatorConstraintInterface,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { ACCENT_COLORS, TIME_REGEX, UFS, isValidCnpj } from '../settings.constants';

/** Texto aparado; vazio vira null (limpa o campo). */
const TrimOrNull = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value));

/** Só dígitos; vazio vira null. */
const DigitsOrNull = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') || null : value));

@ValidatorConstraint({ name: 'cnpj' })
class CnpjConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidCnpj(value);
  }
  defaultMessage() {
    return 'CNPJ inválido';
  }
}

export class OpeningHourDto {
  @IsInt() @Min(0) @Max(6)
  day: number;

  @IsBoolean()
  open: boolean;

  @Matches(TIME_REGEX, { message: 'Horário de abertura deve estar no formato HH:MM' })
  opensAt: string;

  @Matches(TIME_REGEX, { message: 'Horário de encerramento deve estar no formato HH:MM' })
  closesAt: string;
}

/**
 * Atualização parcial das configurações do estabelecimento do usuário logado.
 * O restaurantId vem sempre do token, nunca do corpo.
 */
export class UpdateRestaurantSettingsDto {
  @ApiPropertyOptional({ enum: BusinessType, description: 'Restaurante, Lanchonete, Confeitaria ou Japonês (somente ADMIN)' })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  // ─── Dados do negócio ──────────────────────────────────────────────────────
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80, { message: 'Nome deve ter entre 2 e 80 caracteres' })
  name?: string;

  @ApiPropertyOptional({ description: 'Somente dígitos, com DDD' })
  @IsOptional() @DigitsOrNull()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Somente dígitos, com DDD' })
  @IsOptional() @DigitsOrNull()
  @Matches(/^\d{10,11}$/, { message: 'WhatsApp deve ter 10 ou 11 dígitos' })
  whatsapp?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() || null : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(120)
  email?: string | null;

  @ApiPropertyOptional({ description: 'Opcional; 14 dígitos válidos' })
  @IsOptional() @DigitsOrNull()
  @Validate(CnpjConstraint)
  cnpj?: string | null;

  // ─── Identidade visual ─────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'URL http(s) da imagem (externa ou retornada por /uploads/logos)' })
  @IsOptional() @TrimOrNull()
  @MaxLength(500)
  @Matches(/^https?:\/\/[^\s]+$/i, { message: 'Logo deve ser uma URL http(s) válida' })
  logoUrl?: string | null;

  @ApiPropertyOptional({ enum: ACCENT_COLORS })
  @IsOptional()
  @IsIn(ACCENT_COLORS as unknown as string[], { message: 'Cor de destaque não permitida' })
  accentColor?: string;

  // ─── Endereço ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'CEP com 8 dígitos' })
  @IsOptional() @DigitsOrNull()
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  zipCode?: string | null;

  @ApiPropertyOptional() @IsOptional() @TrimOrNull() @IsString() @MaxLength(120)
  street?: string | null;

  @ApiPropertyOptional() @IsOptional() @TrimOrNull() @IsString() @MaxLength(10)
  number?: string | null;

  @ApiPropertyOptional() @IsOptional() @TrimOrNull() @IsString() @MaxLength(60)
  complement?: string | null;

  @ApiPropertyOptional() @IsOptional() @TrimOrNull() @IsString() @MaxLength(60)
  district?: string | null;

  @ApiPropertyOptional() @IsOptional() @TrimOrNull() @IsString() @MaxLength(60)
  city?: string | null;

  @ApiPropertyOptional({ enum: UFS })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || null : value))
  @IsIn(UFS as unknown as string[], { message: 'UF inválida' })
  state?: string | null;

  // ─── Funcionamento ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: [OpeningHourDto], description: 'Os 7 dias da semana' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7) @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDto)
  openingHours?: OpeningHourDto[];

  // ─── Operação ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional() @IsInt() @Min(1) @Max(240)
  avgPrepMinutes?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  acceptingOrders?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  showUnavailableProducts?: boolean;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional() @TrimOrNull() @IsString() @MaxLength(160)
  orderMessage?: string | null;
}
