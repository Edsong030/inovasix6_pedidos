import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString,
  MaxLength, Min, ValidateIf, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderChannel, OrderStatus, PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Unidades, quilos (fracionado) ou centos, conforme a unidade do produto' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Observação do item (ex.: mensagem no bolo, sem cebola)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs das opções escolhidas nos grupos do produto. Preço e nomes vêm sempre do cadastro (o servidor recalcula).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  optionIds?: string[];
}

export class CreateOrderDto {
  @ApiProperty({ enum: OrderChannel })
  @IsEnum(OrderChannel)
  channel: OrderChannel;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ default: false, description: 'Encomenda com data/hora de retirada ou entrega' })
  @IsOptional()
  @IsBoolean()
  isPreorder?: boolean;

  @ApiPropertyOptional({ example: '2026-09-30T15:00:00-03:00' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

const CANCEL_REASON_REQUIRED = 'Informe o motivo do cancelamento';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus, { message: 'Status inválido' })
  status: OrderStatus;

  @ApiPropertyOptional({
    maxLength: 500,
    description:
      'Motivo da mudança. Obrigatório quando status = CANCELLED; gravado no histórico.',
  })
  // Aparado; vazio ou só espaços conta como ausente
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  // Cancelamento sempre valida (ausente → 400); nas demais, só se o motivo foi enviado
  @ValidateIf(
    (o: UpdateOrderStatusDto) =>
      o.status === OrderStatus.CANCELLED ||
      (o.reason !== undefined && o.reason !== null),
  )
  // Ordem inversa de propósito: o class-validator lista a mensagem do último decorador
  // primeiro, e a primeira mensagem é a exibida ("Informe o motivo..." quando ausente)
  @MaxLength(500, { message: 'O motivo pode ter no máximo 500 caracteres' })
  @IsString({ message: 'O motivo deve ser um texto' })
  @IsNotEmpty({ message: CANCEL_REASON_REQUIRED })
  reason?: string;
}
