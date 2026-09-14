/**
 * Client-side Cloudinary upload and delivery.
 *
 * Bytes go straight from the phone to Cloudinary — nothing round-trips through
 * our server on the way in. We store only the returned secure URL in the data
 * model and derive every rendered size from it.
 */

/**
 * A FIXED set of transformations — two sizes, no per-viewport widths.
 *
 * Generating a derived image for each device width multiplies Cloudinary's
 * transformation count and fragments the CDN cache, so the same two URLs serve
 * every phone. f_auto picks WebP/AVIF per browser and q_auto picks the quality.
 */
const TRANSFORMS = {
  /** Grid tiles: 52px history thumbnails and ~124px sheet tiles, at up to 3×. */
  thumb: "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
  /** Lightbox: long edge capped, aspect ratio untouched. */
  full: "c_limit,w_1080,f_auto,q_auto",
} as const;

export type PhotoSize = keyof typeof TRANSFORMS;

/**
 * Rewrites a stored Cloudinary URL to a fixed derived size. Anything that is
 * not a Cloudinary delivery URL is returned untouched.
 */
export function photoUrl(url: string, size: PhotoSize): string {
  const marker = "/upload/";
  const at = url.indexOf(marker);
  if (at === -1) return url;

  const head = url.slice(0, at + marker.length);
  let tail = url.slice(at + marker.length);

  // Drop any transformation segment already present so sizes never stack.
  const segments = tail.split("/");
  if (segments.length > 1 && /[,_]/.test(segments[0]) && !segments[0].startsWith("v")) {
    tail = segments.slice(1).join("/");
  }

  return `${head}${TRANSFORMS[size]}/${tail}`;
}

export function isCloudinaryConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
}

/* ── client-side compression ─────────────────────────────────────────────── */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

/**
 * Downscales and re-encodes a photo in the browser before upload, so a 12MP
 * phone shot does not cost a 5MB upload on cellular.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // HEIC and friends the browser can't decode — send as-is.
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );

  // If re-encoding somehow made it bigger, keep the original.
  return blob && blob.size < file.size ? blob : file;
}

/* ── upload ──────────────────────────────────────────────────────────────── */

interface SignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/** Uploads one photo and resolves to its stored secure URL. */
export async function uploadPhoto(file: File): Promise<string> {
  const signResponse = await fetch("/api/cloudinary/sign", { method: "POST" });
  if (!signResponse.ok) {
    throw new Error(
      signResponse.status === 501
        ? "Photo upload isn't set up yet"
        : "Couldn't prepare the upload",
    );
  }
  const sign: SignResponse = await signResponse.json();

  const compressed = await compressImage(file);

  // Cloudinary requires `file` to be the last field in the multipart body —
  // otherwise it can't associate the signature/api_key with the request and
  // silently falls back to unsigned-upload validation.
  const form = new FormData();
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("folder", sign.folder);
  form.append("signature", sign.signature);
  form.append("file", compressed, file.name);

  const upload = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!upload.ok) throw new Error("Photo upload failed");

  const result = await upload.json();
  return result.secure_url as string;
}
