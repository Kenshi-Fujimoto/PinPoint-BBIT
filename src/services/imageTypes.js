/**
 * Single source of truth for "which image files can this app upload?".
 *
 * Why this module exists
 * ----------------------
 * The upload UI used to accept a file only when `file.type.startsWith('image/')`.
 * That silently rejects perfectly good JPEGs, because the browser is *not*
 * guaranteed to fill in a MIME type:
 *
 *   - Android Chrome / the Android photo picker frequently hand back
 *     `type: ''` for files chosen from Google Photos, Drive or a file manager.
 *   - Some desktop file managers report `application/octet-stream` for `.jpeg`.
 *   - Some stacks emit the non-standard `image/jpg` instead of `image/jpeg`.
 *
 * When a JPEG arrives with an empty or generic type, the old check failed and
 * the user saw "Please select an image file" even though they *had* selected a
 * JPEG. So: trust the file extension as a fallback, never the MIME type alone.
 *
 * This module is deliberately dependency-free and side-effect free so it can be
 * unit tested in a plain Node environment (see imageTypes.test.js) and imported
 * from both the React uploader and the EdgeStore service.
 */

/** MIME types the browser canvas can actually decode & re-encode. */
export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', // non-standard but emitted by some Android/Java stacks
  'image/pjpeg', // progressive JPEG, reported by older IE/Edge
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
];

/** Filename extensions we accept (matched when the MIME type is missing). */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'png',
  'webp',
  'gif',
  'bmp',
  'avif',
];

/**
 * HEIC/HEIF: Apple's iPhone camera default. Listed separately because most
 * browsers cannot decode it in a <canvas>, so we accept the selection and show
 * a helpful, actionable message instead of a generic "not an image" error.
 */
export const NON_DECODABLE_MIME_TYPES = ['image/heic', 'image/heif'];
export const NON_DECODABLE_EXTENSIONS = ['heic', 'heif'];

/**
 * Value for the file input's `accept` attribute.
 * Explicit extensions are listed alongside the MIME types so the OS picker
 * still offers JPEGs on platforms that ignore the `image/*` wildcard.
 */
export const IMAGE_ACCEPT_ATTRIBUTE = [
  ...SUPPORTED_IMAGE_MIME_TYPES,
  ...SUPPORTED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`),
  'image/*',
].join(',');

/** Human-readable list for UI copy and error messages. */
export const SUPPORTED_FORMATS_LABEL = 'JPG / JPEG / PNG / WebP / GIF';

/**
 * Pull the lowercase extension off a filename, ignoring any query/hash.
 * Returns '' when there is no name or no extension.
 */
export function getFileExtension(file) {
  const name = typeof file === 'string' ? file : file?.name;
  if (typeof name !== 'string' || !name.includes('.')) return '';
  const cleaned = name.split(/[?#]/)[0];
  const dot = cleaned.lastIndexOf('.');
  if (dot === -1 || dot === cleaned.length - 1) return '';
  return cleaned.slice(dot + 1).trim().toLowerCase();
}

/** True when the file's MIME type is one we can decode. */
function hasSupportedMimeType(file) {
  const type = (file?.type || '').toString().trim().toLowerCase();
  return SUPPORTED_IMAGE_MIME_TYPES.includes(type);
}

/** True when the file's extension is one we can decode. */
function hasSupportedExtension(file) {
  const ext = getFileExtension(file);
  return ext !== '' && SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * The main gate used before uploading.
 *
 * A file passes when EITHER its MIME type OR its extension is known-good.
 * The extension fallback is what lets JPEGs with a missing/blank MIME type
 * (common on Android) through instead of being rejected.
 */
export function isSupportedImage(file) {
  if (!file) return false;
  if (hasSupportedMimeType(file)) return true;
  if (hasSupportedExtension(file)) return true;
  // Last resort: a genuinely populated generic image/* type we don't know
  // about (e.g. image/svg+xml is excluded below, but image/avif on a newer
  // browser should still work if the platform reports it).
  const type = (file?.type || '').toString().trim().toLowerCase();
  return type.startsWith('image/') && type !== 'image/svg+xml';
}

/**
 * True for HEIC/HEIF files — the iPhone default format most browsers cannot
 * decode. We detect these so we can show a specific, fixable error message.
 */
export function isNonDecodableImage(file) {
  if (!file) return false;
  const type = (file?.type || '').toString().trim().toLowerCase();
  if (NON_DECODABLE_MIME_TYPES.includes(type)) return true;
  const ext = getFileExtension(file);
  return ext !== '' && NON_DECODABLE_EXTENSIONS.includes(ext);
}

const EXTENSION_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
};

/** Best MIME type for a file, derived from the filename when necessary. */
export function resolveImageMimeType(file) {
  const declared = (file?.type || '').toString().trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream') return declared;
  const ext = getFileExtension(file);
  return EXTENSION_TO_MIME[ext] || declared;
}

/**
 * Return a file whose `type` is a real image MIME type.
 *
 * Some browsers hand back `type: ''` or `application/octet-stream` for JPEGs.
 * EdgeStore and our own canvas pipeline both behave better when the Blob
 * advertises the right type, so we rewrap the file (cheap — no copy of the
 * bytes, `File` just re-references them). Falls back to the original file
 * whenever `File` is unavailable (older jsdom/SSR) or construction throws.
 */
export function normalizeImageFile(file) {
  if (!file) return file;
  const declared = (file.type || '').toString().trim().toLowerCase();
  const isGeneric =
    declared === '' || declared === 'application/octet-stream' || declared === 'binary/octet-stream';
  if (!isGeneric) return file;

  const mime = EXTENSION_TO_MIME[getFileExtension(file)];
  if (!mime || typeof File === 'undefined') return file;

  try {
    return new File([file], file.name || `photo.${getFileExtension(file) || 'jpg'}`, {
      type: mime,
      lastModified: file.lastModified ?? Date.now(),
    });
  } catch (err) {
    // Non-fatal: the raw bytes are still usable, just without a correct type.
    return file;
  }
}

/**
 * Validate an upload candidate and return a user-facing error, or null when
 * the file is good to go. Keeps the wording in one place so the UI and any
 * future native/mobile client say the same thing.
 */
export function validateImageFile(file, { maxSizeBytes = 15 * 1024 * 1024 } = {}) {
  if (!file) return 'No file was selected.';

  if (isNonDecodableImage(file)) {
    return 'That photo is in HEIC/HEIF format (iPhone default). On your iPhone go to Settings → Camera → Formats → "Most Compatible", or export it as JPEG, then try again.';
  }

  if (!isSupportedImage(file)) {
    return `Please select an image file (${SUPPORTED_FORMATS_LABEL}).`;
  }

  if (typeof file.size === 'number' && file.size > maxSizeBytes) {
    const mb = Math.round(maxSizeBytes / (1024 * 1024));
    return `Image file size must be under ${mb}MB. Try a smaller photo or screenshot.`;
  }

  return null;
}
