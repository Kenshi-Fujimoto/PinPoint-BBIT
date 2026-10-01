/**
 * Regression tests for the upload pipeline in `edgestore.jsx`.
 *
 * Background: the JPEG acceptance fix (extension fallback in imageTypes.js)
 * was wired into `uploadToEdgeStore` but the module forgot to import the two
 * helpers it called. Because `isSupportedImage` is only *referenced* inside the
 * function body, the bundle built fine, every existing test still passed, and
 * the app only failed at runtime — the moment a user picked a photo, they saw
 * `isSupportedImage is not defined` in the red error box under the uploader.
 *
 * These tests execute `uploadToEdgeStore` for real (with an injected bucket
 * client) so that any missing import or broken branch fails in CI instead of
 * in a user's face.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadToEdgeStore } from './edgestore.jsx';

/** Minimal stand-in for the EdgeStore client injected into uploadToEdgeStore. */
const bucketClient = (upload) => ({ pinpoint: { upload } });

/** Plain object standing in for a browser File — the code only reads these. */
const fakeFile = (name, type, size = 2048) => ({ name, type, size });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uploadToEdgeStore — cloud bucket path', () => {
  it('uploads a JPEG through the configured bucket (regression: missing imageTypes import)', async () => {
    const upload = vi.fn(async () => ({
      url: 'https://files.edgestore.dev/pinpoint/pothole.jpg',
      size: 5120,
    }));

    const result = await uploadToEdgeStore(
      fakeFile('pothole.jpg', 'image/jpeg'),
      null,
      bucketClient(upload)
    );

    expect(upload).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      url: 'https://files.edgestore.dev/pinpoint/pothole.jpg',
      name: 'pothole.jpg',
    });
  });

  it('accepts a JPEG whose MIME type is blank (Android picker) and normalizes it to image/jpeg', async () => {
    let sentToBucket;
    const upload = vi.fn(async ({ file }) => {
      sentToBucket = file;
      return { url: 'https://files.edgestore.dev/pinpoint/IMG_0042.jpg' };
    });

    const result = await uploadToEdgeStore(
      fakeFile('IMG_0042.JPG', ''), // Android photo picker: no MIME type
      null,
      bucketClient(upload)
    );

    expect(result.url).toBe('https://files.edgestore.dev/pinpoint/IMG_0042.jpg');
    // The bucket must receive a real image MIME type, not the blank one.
    expect(sentToBucket.type).toBe('image/jpeg');
  });

  it('accepts a JPEG reported as application/octet-stream', async () => {
    const upload = vi.fn(async () => ({ url: 'https://files.edgestore.dev/pinpoint/photo.jpeg' }));

    const result = await uploadToEdgeStore(
      fakeFile('photo.jpeg', 'application/octet-stream'),
      null,
      bucketClient(upload)
    );

    expect(result.url).toBe('https://files.edgestore.dev/pinpoint/photo.jpeg');
  });

  it('rejects a non-image file with an actionable message', async () => {
    await expect(
      uploadToEdgeStore(fakeFile('semester-report.pdf', 'application/pdf'), null, null)
    ).rejects.toThrow(/Unsupported file type/i);
  });

  it('reports progress from 0 to 100 on a successful upload', async () => {
    const upload = vi.fn(async ({ onProgressChange }) => {
      onProgressChange?.(50);
      onProgressChange?.(100);
      return { url: 'https://files.edgestore.dev/pinpoint/photo.jpg' };
    });

    const seen = [];
    await uploadToEdgeStore(fakeFile('photo.jpg', 'image/jpeg'), (p) => seen.push(p), bucketClient(upload));

    expect(seen[0]).toBe(20);
    expect(seen[seen.length - 1]).toBe(100);
  });
});

describe('uploadToEdgeStore — client-side compression fallback', () => {
  /**
   * The canvas pipeline is browser-only; stub the three globals it touches so
   * the fallback can be exercised in the plain Node test environment.
   */
  function stubBrowserImagePipeline() {
    const originals = {
      FileReader: globalThis.FileReader,
      Image: globalThis.Image,
      document: globalThis.document,
    };

    globalThis.FileReader = class {
      readAsDataURL() {
        this.onload?.({ target: { result: 'data:image/jpeg;base64,AAAA' } });
      }
    };

    globalThis.Image = class {
      set src(_value) {
        this.width = 1600; // larger than the 1200px cap, so it gets resized
        this.height = 900;
        setTimeout(() => this.onload?.(), 0);
      }
    };

    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage() {} }),
        toDataURL: () => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ',
      }),
    };

    return () => {
      globalThis.FileReader = originals.FileReader;
      globalThis.Image = originals.Image;
      globalThis.document = originals.document;
    };
  }

  it('compresses locally when the bucket upload fails instead of throwing at the user', async () => {
    const restore = stubBrowserImagePipeline();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const upload = vi.fn(async () => {
        throw new Error('EdgeStore bucket unreachable');
      });

      const result = await uploadToEdgeStore(
        fakeFile('pothole.jpg', 'image/jpeg'),
        null,
        bucketClient(upload)
      );

      expect(upload).toHaveBeenCalledTimes(1);
      expect(result.url.startsWith('data:image/jpeg')).toBe(true);
      expect(result.width).toBe(1200); // capped from 1600px
      expect(result.height).toBe(675); // aspect ratio preserved
    } finally {
      restore();
    }
  });
});
