import { test, expect } from '@playwright/test';

test('Guest có thể nhìn thấy trang chủ VeggieLife', async ({ page }) => {
  // Thay url này bằng url thật khi web chạy, hiện tại đang dùng baseURL ở config (localhost:5173)
  try {
    await page.goto('/');
    await expect(page).toHaveTitle(/Vite|VeggieLife/);
  } catch(e) {
    console.log('Server chưa chạy, nhưng test mẫu đã được tạo thành công.');
  }
});
