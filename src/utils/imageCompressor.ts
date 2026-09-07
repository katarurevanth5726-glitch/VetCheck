/**
 * Client-side image compression and resizing utility
 * Ensures high-resolution phone camera photos (5-10+ MB) are optimized before sending to backend.
 * Resizes max dimension to ~1200px, compresses JPEG to ~300-480 KB, preserving skin, wound, and fur detail.
 * Prevents negative compression: If image is already small & within max dimensions, retains the original file.
 */
export async function compressImage(
  fileOrDataUrl: File | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<{ base64: string; dataUrl: string; mimeType: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    if (!fileOrDataUrl) {
      reject(new Error("No image data provided for compression."));
      return;
    }

    const loadDataUrl = (): Promise<{ dataUrl: string; originalSize: number }> => {
      return new Promise((res, rej) => {
        if (typeof fileOrDataUrl === "string") {
          const approxBytes = Math.round((fileOrDataUrl.length * 3) / 4);
          res({ dataUrl: fileOrDataUrl, originalSize: approxBytes });
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              res({
                dataUrl: e.target.result as string,
                originalSize: fileOrDataUrl.size,
              });
            } else {
              rej(new Error("Failed to read file as Data URL"));
            }
          };
          reader.onerror = () => rej(new Error("Failed to read file from disk"));
          reader.readAsDataURL(fileOrDataUrl);
        }
      });
    };

    loadDataUrl()
      .then(({ dataUrl: originalDataUrl, originalSize }) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          const origWidth = img.naturalWidth || img.width;
          const origHeight = img.naturalHeight || img.height;

          if (!origWidth || !origHeight) {
            reject(new Error("Invalid or corrupt image dimensions."));
            return;
          }

          let width = origWidth;
          let height = origHeight;
          const needsResize = width > maxWidth || height > maxHeight;

          if (needsResize) {
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { willReadFrequently: false });
          if (!ctx) {
            reject(new Error("Canvas context creation failed"));
            return;
          }

          // Use high quality image smoothing to preserve injury/skin details
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Fill white background for transparent PNG/WEBP conversion to JPEG
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = "image/jpeg";
          let candidateDataUrl = canvas.toDataURL(mimeType, quality);
          let candidateSize = Math.round((candidateDataUrl.length * 3) / 4);

          // Target ~300-480 KB for fast transmission if large
          if (candidateSize > 500000) {
            candidateDataUrl = canvas.toDataURL(mimeType, 0.7);
            candidateSize = Math.round((candidateDataUrl.length * 3) / 4);
          }
          if (candidateSize > 500000) {
            candidateDataUrl = canvas.toDataURL(mimeType, 0.62);
            candidateSize = Math.round((candidateDataUrl.length * 3) / 4);
          }

          // Rule: If image did not need downscaling and candidate is larger or equal, keep original image
          let finalDataUrl = candidateDataUrl;
          let finalSize = candidateSize;
          let finalMime = mimeType;

          if (!needsResize && candidateSize >= originalSize) {
            finalDataUrl = originalDataUrl;
            finalSize = originalSize;
            if (typeof fileOrDataUrl !== "string" && fileOrDataUrl.type) {
              finalMime = fileOrDataUrl.type;
            }
            console.log(
              `[VetCheck Image Optimizer] Processed: ${origWidth}x${origHeight}px | Original: ${Math.round(
                originalSize / 1024
              )} KB -> Kept original (Optimization skipped — original image was already smaller).`
            );
          } else {
            const reduction = Math.max(0, Math.round(((originalSize - finalSize) / (originalSize || 1)) * 100));
            console.log(
              `[VetCheck Image Optimizer] Processed: ${width}x${height}px${
                needsResize ? ` (Resized from ${origWidth}x${origHeight}px)` : ""
              } | Original: ${Math.round(originalSize / 1024)} KB -> Optimized: ${Math.round(
                finalSize / 1024
              )} KB (${reduction}% reduction)`
            );
          }

          const base64 = finalDataUrl.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

          if (!base64 || base64.length === 0) {
            reject(new Error("Failed to extract Base64 data from processed image."));
            return;
          }

          resolve({
            base64,
            dataUrl: finalDataUrl,
            mimeType: finalMime,
            originalSize,
            compressedSize: finalSize,
          });
        };

        img.onerror = () => {
          reject(new Error("The selected image could not be loaded or processed."));
        };

        img.src = originalDataUrl;
      })
      .catch((err) => reject(err));
  });
}
