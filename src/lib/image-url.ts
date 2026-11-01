/**
 * A smaller, faster version of an uploaded picture for cards and thumbnails.
 *
 * Pictures are stored on Cloudinary, which can resize on request: the address
 * `…/upload/v123/folder/pic.jpg` becomes `…/upload/w_640,…/v123/folder/pic.jpg`.
 * Any other address (or one that already has a transformation) is returned as is,
 * so this is always safe to wrap around an image URL.
 */
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

export function optimizedImageUrl(
  url: string | null | undefined,
  options: { width: number; /** e.g. "4:3" crops to that shape; leave out to keep the original shape. */ aspect?: string }
): string | undefined {
  if (!url) return undefined;
  const match = CLOUDINARY_UPLOAD.exec(url);
  if (!match) return url;
  const transform = [
    `w_${Math.round(options.width)}`,
    ...(options.aspect ? [`ar_${options.aspect}`, "c_fill", "g_auto"] : ["c_limit"]),
    "f_auto",
    "q_auto",
  ].join(",");
  return `${match[1]}${transform}/${match[2]}`;
}
