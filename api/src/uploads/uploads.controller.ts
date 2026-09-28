import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IMAGE_TYPES, VIDEO_TYPES, uploadsRoot, validatedExtension } from './file-signature';
import { publicUploadUrl } from './public-url';

// ─── Destinos e limites ───────────────────────────────────────────────────────
const IMG_DIR  = join(uploadsRoot(), 'products');
const VID_DIR  = join(uploadsRoot(), 'products', 'videos');
const LOGO_DIR = join(uploadsRoot(), 'logos');

const IMG_MAX_SIZE  = 5 * 1024 * 1024;   // 5 MB
const VID_MAX_SIZE  = 15 * 1024 * 1024;  // 15 MB
const LOGO_MAX_SIZE = 2 * 1024 * 1024;   // 2 MB

const IMAGE_EXTS  = Object.values(IMAGE_TYPES).flatMap((t) => t.exts);
const IMAGE_MIMES = Object.values(IMAGE_TYPES).flatMap((t) => t.mimes);
const VIDEO_EXTS  = Object.values(VIDEO_TYPES).flatMap((t) => t.exts);
const VIDEO_MIMES = Object.values(VIDEO_TYPES).flatMap((t) => t.mimes);

// Garante que as pastas existem ao carregar o módulo
for (const dir of [IMG_DIR, VID_DIR, LOGO_DIR]) mkdirSync(dir, { recursive: true });

/**
 * Upload em memória: nada vai para o disco antes de o conteúdo ser validado, então um
 * arquivo recusado (conteúdo falso, formato errado, grande demais) não deixa resto.
 * O filtro recusa cedo extensão/MIME fora da lista; o conteúdo é conferido depois.
 */
function uploadOptions(exts: string[], mimes: string[], maxSize: number, label: string) {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
      const ext = extname(file.originalname ?? '').toLowerCase();
      if (!exts.includes(ext) || !mimes.includes((file.mimetype ?? '').toLowerCase())) {
        return cb(new BadRequestException(`Formato não permitido. Use ${exts.join(', ')} (${label}).`), false);
      }
      cb(null, true);
    },
  };
}

/** Grava com nome aleatório de 128 bits (nunca o nome enviado); 'wx' não sobrescreve nada. */
async function store(dir: string, buffer: Buffer, ext: string): Promise<string> {
  const filename = `${randomBytes(16).toString('hex')}${ext}`;
  await writeFile(join(dir, filename), buffer, { flag: 'wx' });
  return filename;
}

// ─── Controller ───────────────────────────────────────────────────────────────
@ApiTags('Uploads')
@ApiCookieAuth('inx_session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('uploads')
export class UploadsController {

  // ── POST /api/uploads/products — imagem ──────────────────────────────────
  @Post('products')
  @ApiOperation({ summary: 'Upload de imagem de produto (máx. 5 MB, PNG/JPG/WebP; ADMIN/MANAGER)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 400, description: 'Formato não permitido ou conteúdo incompatível' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão' })
  @ApiResponse({ status: 413, description: 'Arquivo maior que o limite' })
  @UseInterceptors(FileInterceptor('file', uploadOptions(IMAGE_EXTS, IMAGE_MIMES, IMG_MAX_SIZE, 'imagem')))
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const filename = await store(IMG_DIR, file.buffer, validatedExtension(file, 'image'));
    return { url: publicUploadUrl(`products/${filename}`), filename, size: file.size, mimetype: file.mimetype };
  }

  // ── POST /api/uploads/logos — logo do estabelecimento ────────────────────
  @Post('logos')
  @ApiOperation({ summary: 'Upload do logo do estabelecimento (máx. 2 MB, PNG/JPG/WebP; ADMIN/MANAGER)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadOptions(IMAGE_EXTS, IMAGE_MIMES, LOGO_MAX_SIZE, 'imagem')))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const filename = await store(LOGO_DIR, file.buffer, validatedExtension(file, 'image'));
    return { url: publicUploadUrl(`logos/${filename}`), filename, size: file.size, mimetype: file.mimetype };
  }

  // ── POST /api/uploads/products/videos — vídeo ────────────────────────────
  @Post('products/videos')
  @ApiOperation({ summary: 'Upload de vídeo de produto (máx. 15 MB, MP4/WebM; ADMIN/MANAGER)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 400, description: 'Formato não permitido ou conteúdo incompatível' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão' })
  @ApiResponse({ status: 413, description: 'Arquivo maior que o limite' })
  @UseInterceptors(FileInterceptor('file', uploadOptions(VIDEO_EXTS, VIDEO_MIMES, VID_MAX_SIZE, 'vídeo')))
  async uploadProductVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const filename = await store(VID_DIR, file.buffer, validatedExtension(file, 'video'));
    return { url: publicUploadUrl(`products/videos/${filename}`), filename, size: file.size, mimetype: file.mimetype };
  }
}
