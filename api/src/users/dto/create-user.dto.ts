import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  /** Senhas novas: 10+ caracteres, com letras e números (login aceita as já existentes). */
  @ApiProperty({ minLength: 10, description: 'Mínimo de 10 caracteres, com letras e números' })
  @IsString()
  @MinLength(10, { message: 'A senha precisa ter pelo menos 10 caracteres' })
  @MaxLength(128, { message: 'A senha pode ter no máximo 128 caracteres' })
  @Matches(/\p{L}/u, { message: 'A senha precisa ter pelo menos uma letra' })
  @Matches(/\d/, { message: 'A senha precisa ter pelo menos um número' })
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
