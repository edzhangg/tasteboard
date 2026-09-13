import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Issues a short-lived signature for a direct-to-Cloudinary upload.
 *
 * The image bytes never pass through this server — the client posts the file
 * straight to Cloudinary with this signature attached. Only the signature is
 * minted here, so CLOUDINARY_API_SECRET stays server-side.
 */
export async function POST() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured" },
      { status: 501 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "tasteboard";

  // Cloudinary signs the upload params sorted by key, joined as k=v&k=v, with
  // the API secret appended.
  const params: Record<string, string> = {
    folder,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return NextResponse.json(
    { cloudName, apiKey, timestamp, folder, signature },
    { headers: { "cache-control": "no-store" } },
  );
}
