import { BadRequestException } from '@nestjs/common';
import { detectImage, detectVideo, validatedExtension } from './file-signature';

export const SAMPLES = {
  png: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]),
  jpeg: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]),
  mp4: Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from([0, 0, 2, 0]), Buffer.from('isomiso2'), Buffer.alloc(32)]),
  webm: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]), Buffer.from([0x42, 0x82, 0x84]), Buffer.from('webm'), Buffer.alloc(32)]),
  mov: Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from('ftypqt  '), Buffer.alloc(32)]),
  heic: Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(32)]),
  mkv: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0xa3, 0x42, 0x82, 0x88]), Buffer.from('matroska'), Buffer.alloc(32)]),
  html: Buffer.from('<html><script>alert(1)</script></html>'),
  gif: Buffer.from('GIF89a\x01\x00\x01\x00'),
};

describe('detecção pelo conteúdo', () => {
  it('imagens: PNG, JPEG e WebP', () => {
    expect(detectImage(SAMPLES.png)).toBe('png');
    expect(detectImage(SAMPLES.jpeg)).toBe('jpeg');
    expect(detectImage(SAMPLES.webp)).toBe('webp');
  });
  it('imagens: recusa GIF, HTML, vídeo e vazio', () => {
    for (const b of [SAMPLES.gif, SAMPLES.html, SAMPLES.mp4, Buffer.alloc(0)]) expect(detectImage(b)).toBeNull();
  });
  it('vídeos: MP4 (ftyp isom) e WebM (EBML + DocType webm)', () => {
    expect(detectVideo(SAMPLES.mp4)).toBe('mp4');
    expect(detectVideo(SAMPLES.webm)).toBe('webm');
  });
  it('vídeos: recusa QuickTime (.mov), HEIC, Matroska (.mkv), imagem e HTML', () => {
    for (const b of [SAMPLES.mov, SAMPLES.heic, SAMPLES.mkv, SAMPLES.png, SAMPLES.html]) expect(detectVideo(b)).toBeNull();
  });
});

describe('validatedExtension: conteúdo, extensão e MIME precisam concordar', () => {
  const f = (buffer: Buffer, originalname: string, mimetype: string) => ({ buffer, originalname, mimetype });
  it('aceita e devolve a extensão pelo conteúdo', () => {
    expect(validatedExtension(f(SAMPLES.png, 'foto.PNG', 'image/png'), 'image')).toBe('.png');
    expect(validatedExtension(f(SAMPLES.jpeg, 'foto.jpeg', 'image/jpeg'), 'image')).toBe('.jpg');
    expect(validatedExtension(f(SAMPLES.webm, 'clip.webm', 'video/webm'), 'video')).toBe('.webm');
  });
  it.each([
    ['extensão falsa (HTML com .png)', f(SAMPLES.html, 'x.png', 'image/png'), 'image'],
    ['MIME falso (texto como image/jpeg)', f(Buffer.from('não sou imagem'), 'x.jpg', 'image/jpeg'), 'image'],
    ['conteúdo PNG com extensão .jpg', f(SAMPLES.png, 'x.jpg', 'image/jpeg'), 'image'],
    ['conteúdo PNG com MIME image/webp', f(SAMPLES.png, 'x.png', 'image/webp'), 'image'],
    ['QuickTime renomeado para .mp4', f(SAMPLES.mov, 'x.mp4', 'video/mp4'), 'video'],
    ['MP4 declarado como WebM', f(SAMPLES.mp4, 'x.webm', 'video/webm'), 'video'],
  ] as const)('recusa %s', (_, file, kind) => {
    expect(() => validatedExtension(file, kind)).toThrow(BadRequestException);
  });
});
