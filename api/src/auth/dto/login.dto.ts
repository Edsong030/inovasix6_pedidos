import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@inovasix.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'restaurante-demo' })
  @IsString()
  @IsNotEmpty()
  restaurantSlug: string;
}
