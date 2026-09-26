import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ─── Imagens ──────────────────────────────────────────────────────────────────
const IMG_DIR      = join(process.cwd(), 'uploads', 'products');
const IMG_MAX_SIZE = 5 * 1024 * 1024;           // 5 MB
const IMG_ALLOWED  = ['.jpg', '.jpeg', '.png', '.webp'];

// ─── Vídeos ───────────────────────────────────────────────────────────────────
const VID_DIR      = join(process.cwd(), 'uploads', 'products', 'videos');
const VID_MAX_SIZE = 15 * 1024 * 1024;          // 15 MB
const VID_ALLOWED  = ['.mp4', '.webm'];

// ─── Logos do estabelecimento ─────────────────────────────────────────────────
const LOGO_DIR      = join(process.cwd(), 'uploads', 'logos');
const LOGO_MAX_SIZE = 2 * 1024 * 1024;          // 2 MB
const LOGO_ALLOWED  = ['.png', '.jpg', '.jpeg', '.webp'];
const LOGO_MIMES    = ['image/png', 'image/jpeg', 'image/webp'];

/** Confere a assinatura real do arquivo (não confia só na extensão/MIME enviados). */
function detectImage(buf: Buffer): '.png' | '.jpg' | '.webp' | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

// Garante que as pastas existem ao carregar o módulo
for (const dir of [IMG_DIR, VID_DIR, LOGO_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── Storage factories ────────────────────────────────────────────────────────
function makeStorage(dest: string) {
  return diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename:    (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

// ─── File-filter factories ────────────────────────────────────────────────────
function makeFilter(allowed: string[], label: string) {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(
        new BadRequestException(
          `Formato não permitido: ${ext}. Use ${allowed.join(', ')} (${label}).`,
        ),
        false,
      );
    }
    cb(null, true);
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────
@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {

  // ── POST /api/uploads/products — imagem ──────────────────────────────────
  @Post('products')
  @ApiOperation({ summary: 'Upload de imagem de produto (máx. 5 MB, JPG/PNG/WEBP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage:    makeStorage(IMG_DIR),
      fileFilter: makeFilter(IMG_ALLOWED, 'imagem'),
      limits:     { fileSize: IMG_MAX_SIZE },
    }),
  )
  uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const host = req.get('host') ?? `localhost:${process.env.PORT ?? 3001}`;
    return {
      url:      `${req.protocol}://${host}/uploads/products/${file.filename}`,
      filename: file.filename,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  // ── POST /api/uploads/logos — logo do estabelecimento ────────────────────
  @Post('logos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Upload do logo do estabelecimento (máx. 2 MB, PNG/JPG/WEBP; ADMIN/MANAGER)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!LOGO_ALLOWED.includes(ext) || !LOGO_MIMES.includes(file.mimetype)) {
          return cb(new BadRequestException('Formato não permitido. Use PNG, JPG ou WebP.'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: LOGO_MAX_SIZE, files: 1 },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { restaurantId: string },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const ext = detectImage(file.buffer);
    if (!ext) throw new BadRequestException('O arquivo não é uma imagem PNG, JPG ou WebP válida.');

    // Nome gerado no servidor, prefixado pelo restaurante (nunca usa o nome enviado)
    const safeId   = user.restaurantId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${safeId}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    await writeFile(join(LOGO_DIR, filename), file.buffer);

    const host = req.get('host') ?? `localhost:${process.env.PORT ?? 3001}`;
    return {
      url:      `${req.protocol}://${host}/uploads/logos/${filename}`,
      filename,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  // ── POST /api/uploads/products/videos — vídeo ────────────────────────────
  @Post('products/videos')
  @ApiOperation({ summary: 'Upload de vídeo de produto (máx. 15 MB, MP4/WEBM)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage:    makeStorage(VID_DIR),
      fileFilter: makeFilter(VID_ALLOWED, 'vídeo'),
      limits:     { fileSize: VID_MAX_SIZE },
    }),
  )
  uploadProductVideo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const host = req.get('host') ?? `localhost:${process.env.PORT ?? 3001}`;
    return {
      url:      `${req.protocol}://${host}/uploads/products/videos/${file.filename}`,
      filename: file.filename,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }
}
