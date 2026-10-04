import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import {
  DigitsOrNull,
  TrimOrNull,
} from '../../restaurants/dto/update-restaurant-settings.dto';
import {
  UFS,
  isValidCnpj,
  isValidCpf,
} from '../../restaurants/settings.constants';

/** Texto aparado (campos obrigatórios: vazio continua vazio e é recusado). */
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
/** Só dígitos (campos obrigatórios). */
const Digits = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  );

@ValidatorConstraint({ name: 'cpfOrCnpj' })
class CpfOrCnpjConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return (
      typeof value === 'string' && (isValidCpf(value) || isValidCnpj(value))
    );
  }
  defaultMessage() {
    return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido';
  }
}

/** Primeiro usuário ADMIN do estabelecimento: mesmas regras de nome, e-mail e senha dos usuários. */
export class InitialAdminDto extends PickType(CreateUserDto, [
  'name',
  'email',
  'password',
] as const) {}

/**
 * Cadastro de estabelecimento cliente pela plataforma. O restaurantId é gerado pelo
 * servidor; o corpo nunca escolhe tenant, papel nem marca de plataforma.
 * Telefone, CEP e UF seguem as mesmas regras da tela Configurações.
 */
export class CreateEstablishmentDto {
  @ApiProperty({ maxLength: 80 })
  @Trim()
  @IsString()
  @Length(2, 80, { message: 'Nome deve ter entre 2 e 80 caracteres' })
  name: string;

  @ApiProperty({
    example: 'pizzaria-do-joao',
    description:
      'Usado no login. Minúsculas, números e hífens; não pode ser alterado depois',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 50, { message: 'Slug deve ter entre 3 e 50 caracteres' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug: use letras minúsculas, números e hífens (ex.: pizzaria-do-joao)',
  })
  slug: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType, { message: 'Tipo de negócio inválido' })
  businessType: BusinessType;

  @ApiProperty({ description: 'CPF (11 dígitos) ou CNPJ (14 dígitos)' })
  @Digits()
  @IsString()
  @Validate(CpfOrCnpjConstraint)
  document: string;

  @ApiProperty({ maxLength: 80 })
  @Trim()
  @IsString()
  @Length(2, 80, {
    message: 'Nome do responsável deve ter entre 2 e 80 caracteres',
  })
  ownerName: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(120)
  email: string;

  @ApiProperty({ description: 'Telefone ou WhatsApp, somente dígitos com DDD' })
  @Digits()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  phone: string;

  @ApiPropertyOptional({ description: 'Somente dígitos, com DDD' })
  @IsOptional()
  @DigitsOrNull()
  @Matches(/^\d{10,11}$/, { message: 'WhatsApp deve ter 10 ou 11 dígitos' })
  whatsapp?: string | null;

  @ApiProperty({ description: 'CEP com 8 dígitos' })
  @Digits()
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  zipCode: string;

  @ApiProperty({ maxLength: 120 })
  @Trim()
  @IsString()
  @Length(2, 120, { message: 'Endereço deve ter entre 2 e 120 caracteres' })
  street: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(10)
  number?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(60)
  complement?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(60)
  district?: string | null;

  @ApiProperty({ maxLength: 60 })
  @Trim()
  @IsString()
  @Length(2, 60, { message: 'Cidade deve ter entre 2 e 60 caracteres' })
  city: string;

  @ApiProperty({ enum: UFS })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(UFS, { message: 'UF inválida' })
  state: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ type: InitialAdminDto })
  @IsDefined({ message: 'Informe o administrador inicial' })
  @ValidateNested()
  @Type(() => InitialAdminDto)
  admin: InitialAdminDto;
}

/** Edição dos dados do cliente. Slug, admin e status ficam de fora (status tem rota própria). */
export class UpdateEstablishmentDto extends PartialType(
  OmitType(CreateEstablishmentDto, ['slug', 'admin', 'active'] as const),
) {}

export class UpdateEstablishmentStatusDto {
  @ApiProperty()
  @IsBoolean()
  active: boolean;
}
