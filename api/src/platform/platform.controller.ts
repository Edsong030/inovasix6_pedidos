import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformService } from './platform.service';
import {
  CreateEstablishmentDto,
  UpdateEstablishmentDto,
  UpdateEstablishmentStatusDto,
} from './dto/establishment.dto';

/** Área da plataforma Inovasix6: cadastro e gestão de estabelecimentos clientes. */
@ApiTags('Platform')
@ApiCookieAuth('inx_session')
@UseGuards(JwtAuthGuard, RolesGuard, PlatformAdminGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@Controller('platform/establishments')
export class PlatformController {
  constructor(private svc: PlatformService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os estabelecimentos clientes (PLATFORM_ADMIN)',
  })
  list() {
    return this.svc.list();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de um estabelecimento cliente e seus administradores',
  })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria o estabelecimento e o primeiro usuário ADMIN dele',
  })
  create(@Body() dto: CreateEstablishmentDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita os dados do estabelecimento (slug não muda)',
  })
  update(@Param('id') id: string, @Body() dto: UpdateEstablishmentDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Ativa ou inativa; inativar encerra as sessões do estabelecimento',
  })
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEstablishmentStatusDto,
  ) {
    return this.svc.setStatus(id, dto.active);
  }
}
