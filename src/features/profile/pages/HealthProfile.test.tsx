import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { useUiStore } from '@/stores/ui.store';
import { HEALTH, me, mockProfileApi, signInAsGuest, signInAsMember, toastMessages } from '../test/profileFixtures';
import HealthProfile from './HealthProfile';

const writes = (calls: { method: string }[]) => calls.filter((c) => c.method !== 'GET');
const bmiValue = () => screen.queryByTestId('bmi-value')?.textContent;

describe('HealthProfile (SCR-08)', () => {
  describe('Khách', () => {
    beforeEach(() => signInAsGuest());

    it('BMI xem trước đổi ngay khi gõ chiều cao, cân nặng; không gọi API hồ sơ', async () => {
      const calls = mockProfileApi();
      renderPage(<HealthProfile />);
      expect(screen.getByText('Nhập chiều cao và cân nặng để xem chỉ số BMI.')).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/Chiều cao/), '162');
      await userEvent.type(screen.getByLabelText(/Cân nặng hiện tại/), '54,5');
      expect(bmiValue()).toBe('20,8');
      expect(screen.getByText('Bình thường')).toBeInTheDocument();
      await userEvent.clear(screen.getByLabelText(/Cân nặng hiện tại/));
      await userEvent.type(screen.getByLabelText(/Cân nặng hiện tại/), '80');
      expect(bmiValue()).toBe('30,5');
      expect(screen.getByText('Béo phì')).toBeInTheDocument();
      expect(calls.some((c) => c.url === '/users/me')).toBe(false);
    });

    it('bấm Lưu thì mời đăng ký, không gửi lên server', async () => {
      const calls = mockProfileApi();
      renderPage(<HealthProfile />);
      await userEvent.click(screen.getByRole('button', { name: /Lưu hồ sơ sức khỏe/ }));
      expect(useUiStore.getState().signupPrompt.open).toBe(true);
      expect(writes(calls)).toHaveLength(0);
    });
  });

  describe('Thành viên', () => {
    beforeEach(() => signInAsMember());

    it('điền sẵn hồ sơ, hiện chỉ số server và lịch sử cân nặng', async () => {
      mockProfileApi();
      renderPage(<HealthProfile />);
      expect(screen.getByRole('status', { name: 'Đang tải hồ sơ sức khỏe' })).toBeInTheDocument();
      expect(await screen.findByLabelText(/Chiều cao/)).toHaveValue('162');
      expect(screen.getByLabelText(/Cân nặng hiện tại/)).toHaveValue('54.5');
      expect(screen.getByLabelText(/Ngày sinh/)).toHaveValue('2003-04-12');
      expect(screen.getByLabelText('Nữ')).toBeChecked();
      expect(screen.getByLabelText(/Giảm cân/)).toBeChecked();
      await waitFor(() => expect(screen.getByLabelText(/Trường phái ăn chay/)).toHaveValue('1'));
      const metrics = within(screen.getByRole('region', { name: 'Chỉ số hiện tại' }));
      expect(metrics.getByText('1.200')).toBeInTheDocument();
      expect(await screen.findByText('15/10/2026')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /Cân nặng từ 55,6 kg/ })).toBeInTheDocument();
    });

    it('nhập sai thì báo lỗi ngay trên màn hình, không gọi PUT', async () => {
      const calls = mockProfileApi();
      renderPage(<HealthProfile />);
      const height = await screen.findByLabelText(/Chiều cao/);
      await userEvent.clear(height);
      await userEvent.type(height, '300');
      await userEvent.tab();
      expect(screen.getByText('Chiều cao phải từ 50 đến 250 cm.')).toBeInTheDocument();
      const weight = screen.getByLabelText(/Cân nặng hiện tại/);
      await userEvent.clear(weight);
      await userEvent.type(weight, '15');
      await userEvent.tab();
      expect(screen.getByText('Cân nặng phải từ 20 đến 300 kg.')).toBeInTheDocument();
      // BMI xem trước cũng báo khoảng hợp lệ thay vì tính sai.
      expect(screen.getByText('Chiều cao cần từ 50 đến 250 cm.')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Lưu hồ sơ sức khỏe/ }));
      expect(writes(calls)).toHaveLength(0);

      // Sửa lại thì lỗi mất ngay khi gõ.
      await userEvent.clear(height);
      await userEvent.type(height, '165');
      expect(screen.queryByText('Chiều cao phải từ 50 đến 250 cm.')).not.toBeInTheDocument();
    });

    it('lưu hợp lệ gửi PUT với số đã đổi sang number và cập nhật chỉ số', async () => {
      const calls = mockProfileApi((req) =>
        req.method === 'PUT' && req.url === '/users/me/health-profile'
          ? { message: 'Cập nhật hồ sơ sức khỏe thành công.', data: { ...HEALTH, currentWeightKg: 53.8, bmi: 20.5, targetDailyCalories: 1250, updatedAt: '2026-10-17T09:00:00Z' } }
          : undefined
      );
      renderPage(<HealthProfile />);
      const weight = await screen.findByLabelText(/Cân nặng hiện tại/);
      await waitFor(() => expect(screen.getByLabelText(/Trường phái ăn chay/)).toHaveValue('1'));
      await userEvent.clear(weight);
      await userEvent.type(weight, '53,8');
      await userEvent.click(screen.getByRole('button', { name: /Lưu hồ sơ sức khỏe/ }));
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: 'PUT',
          url: '/users/me/health-profile',
          body: {
            heightCm: 162,
            weightKg: 53.8,
            dateOfBirth: '2003-04-12',
            gender: 'FEMALE',
            dietarySchoolId: 1,
            healthGoal: 'LOSE_WEIGHT',
            targetWeightKg: 52,
            requiresAlliumFree: false,
            regionPreference: 'SOUTH',
          },
        })
      );
      expect(await screen.findByText('1.250')).toBeInTheDocument();
      expect(toastMessages()).toContain('Cập nhật hồ sơ sức khỏe thành công.');
    });

    it('chọn trường phái kiêng ngũ vị tân thì tự bật và khóa ô kiêng ngũ vị tân', async () => {
      mockProfileApi();
      renderPage(<HealthProfile />);
      await screen.findByRole('option', { name: 'Chay kiêng ngũ vị tân' });
      const allium = screen.getByRole('checkbox', { name: /Kiêng ngũ vị tân/ });
      expect(allium).not.toBeChecked();
      await userEvent.selectOptions(screen.getByLabelText(/Trường phái ăn chay/), '5');
      await waitFor(() => expect(allium).toBeChecked());
      expect(allium).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(allium);
      expect(allium).toBeChecked();
    });

    it('ghi cân nặng: sai thì báo ngay, đúng thì POST và làm mới lịch sử', async () => {
      const calls = mockProfileApi((req) =>
        req.method === 'POST' ? { status: 201, message: 'Đã ghi cân nặng.', data: { logId: 9, weightKg: 54, bmi: 20.6, targetDailyCalories: 1200 } } : undefined
      );
      renderPage(<HealthProfile />);
      const input = await screen.findByLabelText(/Cân nặng \(kg\)/);
      await userEvent.type(input, '400');
      await userEvent.tab();
      expect(within(input.parentElement as HTMLElement).getByText('Cân nặng phải từ 20 đến 300 kg.')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Ghi cân nặng/ }));
      expect(writes(calls)).toHaveLength(0);

      await userEvent.clear(input);
      await userEvent.type(input, '54');
      await userEvent.type(screen.getByLabelText('Ghi chú'), 'Cân buổi sáng');
      await userEvent.click(screen.getByRole('button', { name: /Ghi cân nặng/ }));
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({ method: 'POST', url: '/users/me/weight-history', body: { weightKg: 54, note: 'Cân buổi sáng' } })
      );
      expect(toastMessages()).toContain('Đã ghi cân nặng.');
    });

    it('chưa có hồ sơ sức khỏe: nhắc lập hồ sơ; ghi cân nặng nhận 409 thì mở hộp thoại', async () => {
      mockProfileApi(
        (req) =>
          req.method === 'POST'
            ? { status: 409, errorCode: 'ERR_PROFILE_NOT_COMPLETED', message: 'Bạn cần lập hồ sơ sức khỏe trước khi ghi cân nặng.' }
            : req.url === '/users/me/weight-history'
              ? { data: [], meta: { page: 1, size: 10, total: 0 } }
              : undefined,
        () => me({ health: null })
      );
      renderPage(<HealthProfile />);
      expect(await screen.findByText('Bạn chưa có hồ sơ sức khỏe')).toBeInTheDocument();
      expect(await screen.findByText(/Chưa có dữ liệu cân nặng/)).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/Cân nặng \(kg\)/), '60');
      await userEvent.click(screen.getByRole('button', { name: /Ghi cân nặng/ }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Bạn cần lập hồ sơ sức khỏe trước khi ghi cân nặng.')).toBeInTheDocument();
    });

    it('số đo quá 30 ngày thì nhắc cập nhật', async () => {
      mockProfileApi(undefined, () => me({ health: { ...HEALTH, isStaleMetrics: true } }));
      renderPage(<HealthProfile />);
      expect(await screen.findByText('Đã hơn 30 ngày bạn chưa cập nhật số đo')).toBeInTheDocument();
    });

    it('lỗi 500 khi tải hồ sơ thì hiện trạng thái lỗi có nút thử lại', async () => {
      mockProfileApi((req) =>
        req.url === '/users/me' ? { status: 500, errorCode: 'ERR_SYS_DATABASE_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu.' } : undefined
      );
      renderPage(<HealthProfile />);
      expect(await screen.findByText('Không kết nối được cơ sở dữ liệu.', {}, { timeout: 3000 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    });
  });
});
