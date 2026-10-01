import { describe, it, expect } from 'vitest';
import {
  isSupportedImage,
  isNonDecodableImage,
  getFileExtension,
  resolveImageMimeType,
  normalizeImageFile,
  validateImageFile,
  IMAGE_ACCEPT_ATTRIBUTE,
} from './imageTypes.js';

/** Minimal stand-in for a browser File — the helpers only read name/type/size. */
const file = (name, type, size = 1024) => ({ name, type, size });

describe('getFileExtension', () => {
  it('reads lowercase extensions from filenames', () => {
    expect(getFileExtension(file('photo.JPEG', ''))).toBe('jpeg');
    expect(getFileExtension(file('a.b.c.png', ''))).toBe('png');
  });

  it('ignores query strings and returns empty when there is no extension', () => {
    expect(getFileExtension(file('photo.jpg?w=200', ''))).toBe('jpg');
    expect(getFileExtension(file('noextension', ''))).toBe('');
    expect(getFileExtension(undefined)).toBe('');
  });
});

describe('isSupportedImage — the JPEG acceptance fix', () => {
  it('accepts a normal image/jpeg', () => {
    expect(isSupportedImage(file('pothole.jpg', 'image/jpeg'))).toBe(true);
  });

  it('accepts JPEGs whose MIME type is missing entirely (Android photo picker)', () => {
    expect(isSupportedImage(file('pothole.jpg', ''))).toBe(true);
    expect(isSupportedImage(file('pothole.jpeg', ''))).toBe(true);
  });

  it('accepts JPEGs reported as application/octet-stream', () => {
    expect(isSupportedImage(file('pothole.jpeg', 'application/octet-stream'))).toBe(true);
  });

  it('accepts the non-standard image/jpg MIME type', () => {
    expect(isSupportedImage(file('pothole.jpg', 'image/jpg'))).toBe(true);
  });

  it('accepts progressive JPEG and jfif extensions', () => {
    expect(isSupportedImage(file('pothole.jfif', ''))).toBe(true);
    expect(isSupportedImage(file('pothole.jpg', 'image/pjpeg'))).toBe(true);
  });

  it('still accepts png, webp, gif, bmp and avif', () => {
    expect(isSupportedImage(file('a.png', 'image/png'))).toBe(true);
    expect(isSupportedImage(file('a.webp', 'image/webp'))).toBe(true);
    expect(isSupportedImage(file('a.gif', 'image/gif'))).toBe(true);
    expect(isSupportedImage(file('a.bmp', ''))).toBe(true);
    expect(isSupportedImage(file('a.avif', 'image/avif'))).toBe(true);
  });

  it('rejects non-images even when the extension is unknown', () => {
    expect(isSupportedImage(file('notes.pdf', 'application/pdf'))).toBe(false);
    expect(isSupportedImage(file('notes.txt', ''))).toBe(false);
    expect(isSupportedImage(file('clip.mp4', 'video/mp4'))).toBe(false);
  });

  it('rejects SVG, which the canvas pipeline cannot safely rasterise', () => {
    expect(isSupportedImage(file('logo.svg', 'image/svg+xml'))).toBe(false);
  });

  it('rejects null/undefined instead of throwing', () => {
    expect(isSupportedImage(null)).toBe(false);
    expect(isSupportedImage(undefined)).toBe(false);
  });
});

describe('isNonDecodableImage', () => {
  it('flags HEIC/HEIF by MIME type and by extension', () => {
    expect(isNonDecodableImage(file('IMG_0001.heic', 'image/heic'))).toBe(true);
    expect(isNonDecodableImage(file('IMG_0001.heic', ''))).toBe(true);
    expect(isNonDecodableImage(file('IMG_0002.HEIF', ''))).toBe(true);
  });

  it('does not flag JPEGs', () => {
    expect(isNonDecodableImage(file('IMG_0001.jpg', 'image/jpeg'))).toBe(false);
  });
});

describe('resolveImageMimeType / normalizeImageFile', () => {
  it('keeps an already-correct MIME type', () => {
    expect(resolveImageMimeType(file('a.jpg', 'image/jpeg'))).toBe('image/jpeg');
  });

  it('infers image/jpeg from the extension when the type is blank', () => {
    expect(resolveImageMimeType(file('a.jpeg', ''))).toBe('image/jpeg');
    expect(resolveImageMimeType(file('a.JPG', 'application/octet-stream'))).toBe('image/jpeg');
  });

  it('rewraps a JPEG with a missing type so EdgeStore receives image/jpeg', () => {
    const normalized = normalizeImageFile(file('campus.jpeg', ''));
    expect(normalized.type).toBe('image/jpeg');
    expect(normalized.name).toBe('campus.jpeg');
  });

  it('leaves a correctly typed file untouched', () => {
    const original = file('campus.jpeg', 'image/jpeg');
    expect(normalizeImageFile(original)).toBe(original);
  });
});

describe('validateImageFile', () => {
  it('returns null for a valid JPEG', () => {
    expect(validateImageFile(file('a.jpg', 'image/jpeg'))).toBeNull();
  });

  it('explains what to do about HEIC', () => {
    expect(validateImageFile(file('a.heic', 'image/heic'))).toMatch(/HEIC/);
  });

  it('names the supported formats when rejecting a non-image', () => {
    expect(validateImageFile(file('a.pdf', 'application/pdf'))).toMatch(/JPG \/ JPEG \/ PNG \/ WebP \/ GIF/);
  });

  it('enforces the size cap', () => {
    const big = file('huge.jpg', 'image/jpeg', 20 * 1024 * 1024);
    expect(validateImageFile(big)).toMatch(/under 15MB/);
    expect(validateImageFile(big, { maxSizeBytes: 25 * 1024 * 1024 })).toBeNull();
  });

  it('rejects a missing file', () => {
    expect(validateImageFile(null)).toMatch(/No file/);
  });
});

describe('IMAGE_ACCEPT_ATTRIBUTE', () => {
  it('includes both jpeg MIME types and the .jpeg/.jpg extensions', () => {
    expect(IMAGE_ACCEPT_ATTRIBUTE).toContain('image/jpeg');
    expect(IMAGE_ACCEPT_ATTRIBUTE).toContain('image/jpg');
    expect(IMAGE_ACCEPT_ATTRIBUTE).toContain('.jpeg');
    expect(IMAGE_ACCEPT_ATTRIBUTE).toContain('.jpg');
  });
});
