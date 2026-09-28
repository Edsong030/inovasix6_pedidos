import { BadRequestException } from '@nestjs/common';
import { extname, join, resolve } from 'path';

/**
 * Validação de uploads pelo CONTEÚDO do arquivo (bytes iniciais), não só pela extensão ou
 * pelo MIME informado pelo navegador. Extensão, MIME e conteúdo precisam concordar.
 */

export type ImageKind = 'png' | 'jpeg' | 'webp';
export type VideoKind = 'mp4' | 'webm';

type Spec = { ext: string; exts: readonly string[]; mimes: readonly string[] };

export const IMAGE_TYPES: Readonly<Record<ImageKind, Spec>> = {
  png:  { ext: '.png',  exts: ['.png'],          mimes: ['image/png'] },
  jpeg: { ext: '.jpg',  exts: ['.jpg', '.jpeg'], mimes: ['image/jpeg'] },
  webp: { ext: '.webp', exts: ['.webp'],         mimes: ['image/webp'] },
};

export const VIDEO_TYPES: Readonly<Record<VideoKind, Spec>> = {
  mp4:  { ext: '.mp4',  exts: ['.mp4'],  mimes: ['video/mp4'] },
  webm: { ext: '.webm', exts: ['.webm'], mimes: ['video/webm'] },
};

export function detectImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Marcas ("brands") de MP4 aceitas. Fora da lista: QuickTime (.mov), HEIC/AVIF (imagens) etc. */
const MP4_BRANDS = new Set(['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'mmp4', 'MSNV']);
/** Elemento EBML DocType ("webm"): 0x4282, tamanho 4 (0x84) e o texto. Matroska (.mkv) fica de fora. */
const WEBM_DOCTYPE = Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]);

export function detectVideo(buf: Buffer): VideoKind | null {
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp' && buf.readUInt32BE(0) >= 8 && MP4_BRANDS.has(buf.toString('ascii', 8, 12))) {
    return 'mp4';
  }
  if (buf.length >= 4 && buf.readUInt32BE(0) === 0x1a45dfa3 && buf.subarray(0, 64).indexOf(WEBM_DOCTYPE) !== -1) return 'webm';
  return null;
}

const REJECTED = 'Arquivo inválido: o conteúdo não corresponde a um formato permitido';

/**
 * Confere que conteúdo, extensão e MIME são do MESMO formato permitido e devolve a
 * extensão a usar no disco (derivada do conteúdo, nunca do nome enviado).
 */
export function validatedExtension(
  file: Pick<Express.Multer.File, 'buffer' | 'originalname' | 'mimetype'>,
  kind: 'image' | 'video',
): string {
  const detected = kind === 'image' ? detectImage(file.buffer) : detectVideo(file.buffer);
  const spec = detected ? (kind === 'image' ? IMAGE_TYPES[detected as ImageKind] : VIDEO_TYPES[detected as VideoKind]) : null;
  const ext = extname(file.originalname ?? '').toLowerCase();
  if (!spec || !spec.exts.includes(ext) || !spec.mimes.includes((file.mimetype ?? '').toLowerCase())) {
    throw new BadRequestException(REJECTED);
  }
  return spec.ext;
}

/** Pasta raiz dos uploads (UPLOADS_DIR ou ./uploads). Os testes usam uma pasta temporária. */
export function uploadsRoot(): string {
  return process.env.UPLOADS_DIR ? resolve(process.env.UPLOADS_DIR) : join(process.cwd(), 'uploads');
}
