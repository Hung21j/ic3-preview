/**
 * Utilities for image handling, compression, and encoding for questions.
 */

export async function compressAndEncodeImage(
  file: File,
  maxDim = 900,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if valid image
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Tệp được chọn không phải là hình ảnh hợp lệ."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Không thể tải dữ liệu ảnh."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down if larger than maxDim
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(reader.result as string);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer PNG for small images or images with transparency, JPEG otherwise
        const isPng = file.type === "image/png" && file.size < 200 * 1024;
        const mimeType = isPng ? "image/png" : "image/jpeg";
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve(compressedBase64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
