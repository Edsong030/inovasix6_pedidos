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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// ─── Imagens ──────────────────────────────────────────────────────────────────
const IMG_DIR      = join(process.cwd(), 'uploads', 'products');
const IMG_MAX_SIZE = 5 * 1024 * 1024;           // 5 MB
const IMG_ALLOWED  = ['.jpg', '.jpeg', '.png', '.webp'];

// ─── Vídeos ───────────────────────────────────────────────────────────────────
const VID_DIR      = join(process.cwd(), 'uploads', 'products', 'videos');
const VID_MAX_SIZE = 15 * 1024 * 1024;          // 15 MB
const VID_ALLOWED  = ['.mp4', '.webm'];

// Garante que as pastas existem ao carregar o módulo
for (const dir of [IMG_DIR, VID_DIR]) {
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
