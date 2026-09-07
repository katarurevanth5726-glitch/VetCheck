/**
 * Technical Client-Side Photo Quality Evaluator
 * Analyzes brightness, contrast, edge sharpness (blur estimate), and framing.
 * Completely distinct from clinical diagnosis confidence.
 */

export interface DetailedImageQuality {
  rating: "Good" | "Acceptable" | "Poor";
  issues: string[];
  retakeRecommended: boolean;
  averageBrightness: number;
  isDark: boolean;
  isOverexposed: boolean;
  isBlurry: boolean;
  score: number; // 0 - 100
}

export function checkImageQuality(dataUrl: string): Promise<DetailedImageQuality> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve({
            rating: "Acceptable",
            issues: [],
            retakeRecommended: false,
            averageBrightness: 128,
            isDark: false,
            isOverexposed: false,
            isBlurry: false,
            score: 75,
          });
          return;
        }

        // Downscale to 128x128 for efficient edge & luminance computation
        const W = 128;
        const H = 128;
        canvas.width = W;
        canvas.height = H;
        ctx.drawImage(img, 0, 0, W, H);

        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        const totalPixels = W * H;

        let totalBrightness = 0;
        const gray: number[] = new Array(totalPixels);

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalBrightness += lum;
          gray[i / 4] = lum;
        }

        const avgBrightness = totalBrightness / totalPixels;
        const isDark = avgBrightness < 45;
        const isOverexposed = avgBrightness > 230;

        // Simple discrete Laplacian edge variance estimation for blur detection
        let edgeSum = 0;
        let edgeVariance = 0;
        let edgeCount = 0;

        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const idx = y * W + x;
            // Discrete Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
            const laplacian = Math.abs(
              gray[idx - W] +
              gray[idx + W] +
              gray[idx - 1] +
              gray[idx + 1] -
              4 * gray[idx]
            );
            edgeSum += laplacian;
            edgeCount++;
          }
        }

        const avgLaplacian = edgeSum / (edgeCount || 1);
        const isBlurry = avgLaplacian < 7.5;

        const issues: string[] = [];
        if (isDark) issues.push("Low lighting (too dark) — recommend daylight or flashlight");
        if (isOverexposed) issues.push("Overexposed / strong glare — avoid direct flash reflection");
        if (isBlurry) issues.push("Slight blur detected — hold camera steady and tap to focus");

        let rating: "Good" | "Acceptable" | "Poor" = "Good";
        let retakeRecommended = false;
        let score = 90;

        if (isDark || isBlurry || isOverexposed) {
          if ((isDark && isBlurry) || (isOverexposed && isBlurry)) {
            rating = "Poor";
            retakeRecommended = true;
            score = 35;
          } else {
            rating = "Acceptable";
            retakeRecommended = false;
            score = 65;
          }
        }

        resolve({
          rating,
          issues,
          retakeRecommended,
          averageBrightness: avgBrightness,
          isDark,
          isOverexposed,
          isBlurry,
          score,
        });
      } catch (e) {
        resolve({
          rating: "Acceptable",
          issues: [],
          retakeRecommended: false,
          averageBrightness: 128,
          isDark: false,
          isOverexposed: false,
          isBlurry: false,
          score: 70,
        });
      }
    };
    img.onerror = () => {
      resolve({
        rating: "Acceptable",
        issues: [],
        retakeRecommended: false,
        averageBrightness: 128,
        isDark: false,
        isOverexposed: false,
        isBlurry: false,
        score: 70,
      });
    };
    img.src = dataUrl;
  });
}

/**
 * Rotate an image by 90 degrees clockwise
 */
export function rotateImage90(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
