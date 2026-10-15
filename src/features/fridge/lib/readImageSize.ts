/**
 * Đọc kích thước (width × height) của tệp ảnh trên trình duyệt mà không cần tải lên máy chủ.
 * Trả về null nếu tệp không phải ảnh hợp lệ hoặc không thể giải mã.
 */
export function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    // Nếu môi trường hỗ trợ createImageBitmap (nhanh và chạy trên worker/main thread)
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then((bitmap) => {
          const width = bitmap.width;
          const height = bitmap.height;
          bitmap.close();
          resolve({ width, height });
        })
        .catch(() => {
          fallbackWithImg(file, resolve);
        });
      return;
    }

    fallbackWithImg(file, resolve);
  });
}

function fallbackWithImg(file: File, resolve: (res: { width: number; height: number } | null) => void) {
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  } catch {
    resolve(null);
  }
}
