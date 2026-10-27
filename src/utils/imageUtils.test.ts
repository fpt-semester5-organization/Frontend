import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  validateImageDimensions,
  formatFileSize,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from './imageUtils';

describe('imageUtils', () => {
  describe('formatFileSize', () => {
    it('định dạng đúng các mốc dung lượng B, KB, MB', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB');
    });
  });

  describe('validateImageFile', () => {
    it('chấp nhận các định dạng ảnh hợp lệ: jpg, png, webp, heic dưới 10MB', () => {
      const validJpg = new File(['dummy_content'], 'fridge.jpg', { type: 'image/jpeg' });
      const validPng = new File(['dummy_content'], 'fridge.png', { type: 'image/png' });
      const validWebp = new File(['dummy_content'], 'fridge.webp', { type: 'image/webp' });

      expect(validateImageFile(validJpg).isValid).toBe(true);
      expect(validateImageFile(validPng).isValid).toBe(true);
      expect(validateImageFile(validWebp).isValid).toBe(true);
    });

    it('từ chối tệp rỗng dung lượng 0 bytes', () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const res = validateImageFile(emptyFile);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('rỗng');
    });

    it('từ chối định dạng tệp không được hỗ trợ (pdf, txt, exe)', () => {
      const invalidFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const res = validateImageFile(invalidFile);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('Định dạng tệp không được hỗ trợ');
    });

    it('từ chối tệp vượt quá giới hạn 10 MB', () => {
      const largeFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
      // Giả lập size > 10MB
      Object.defineProperty(largeFile, 'size', { value: MAX_IMAGE_FILE_SIZE_BYTES + 1024 });

      const res = validateImageFile(largeFile);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('Dung lượng tối đa cho phép là 10 MB');
    });
  });

  describe('validateImageDimensions', () => {
    it('chấp nhận ảnh ngang đạt chuẩn tối thiểu >= 640x480 px', () => {
      expect(validateImageDimensions({ width: 640, height: 480 }).isValid).toBe(true);
      expect(validateImageDimensions({ width: 1920, height: 1080 }).isValid).toBe(true);
    });

    it('chấp nhận ảnh dọc đạt chuẩn tối thiểu >= 480x640 px', () => {
      expect(validateImageDimensions({ width: 480, height: 640 }).isValid).toBe(true);
      expect(validateImageDimensions({ width: 1080, height: 1920 }).isValid).toBe(true);
    });

    it('từ chối ảnh quá nhỏ (< 640x480 px)', () => {
      const res = validateImageDimensions({ width: 320, height: 240 });
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('Độ phân giải ảnh quá nhỏ');
    });
  });
});
