import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';

export class CreateTableDto {
  @ApiProperty({ example: '01' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class UpdateTableStatusDto {
  @ApiProperty({ enum: TableStatus })
  @IsEnum(TableStatus)
  status: TableStatus;
}
