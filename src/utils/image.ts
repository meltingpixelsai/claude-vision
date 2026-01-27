import sharp from 'sharp';

export interface ImageOptions {
  resize?: number;      // Max dimension (width or height)
  quality?: number;     // 1-100
  format?: 'png' | 'jpeg';
}

/**
 * Process an image buffer with optional resize and compression
 */
export async function processImage(
  buffer: Buffer,
  options: ImageOptions = {}
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Get image metadata for resize calculations
  const metadata = await pipeline.metadata();

  // Resize if specified
  if (options.resize && metadata.width && metadata.height) {
    const maxDim = options.resize;
    if (metadata.width > maxDim || metadata.height > maxDim) {
      pipeline = pipeline.resize({
        width: metadata.width > metadata.height ? maxDim : undefined,
        height: metadata.height >= metadata.width ? maxDim : undefined,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  // Output format
  const format = options.format || 'png';
  const quality = options.quality || 80;

  if (format === 'jpeg') {
    return pipeline.jpeg({ quality }).toBuffer();
  } else {
    // PNG compression level (0-9, where 9 is max compression)
    const compressionLevel = Math.round(9 - (quality / 100 * 9));
    return pipeline.png({ compressionLevel }).toBuffer();
  }
}

/**
 * Crop an image to a specific region
 */
export async function cropImage(
  buffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(buffer)
    .extract({
      left: Math.max(0, Math.round(x)),
      top: Math.max(0, Math.round(y)),
      width: Math.round(width),
      height: Math.round(height)
    })
    .png()
    .toBuffer();
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}
