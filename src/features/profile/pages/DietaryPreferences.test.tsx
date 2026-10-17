import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { useUiStore } from '@/stores/ui.store';
import { HEALTH, me, mockProfileApi, signInAsGuest, signInAsMember, toastMessages } from '../test/profileFixtures';
import DietaryPreferences from './DietaryPreferences';

const writes = (calls: { method: string }[]) => calls.filter((c) => c.method !== 'GET');
const allergySection = () => within(screen.getByRole('region', { name: 'Dị ứng thực phẩm' }));
const schoolSection = () => within(screen.getByRole('region', { name: 'Trường phái ăn chay' }));
/** Chờ GET /users/me xong (trang đang hiện skeleton). */
const pageLoaded = () => screen.findByRole('region', { name: 'Dị ứng thực phẩm' });

describe('DietaryPreferences (SCR-09)', () => {
  it('Khách xem được danh mục; bấm lưu thì mời đăng ký', async () => {
    signInAsGuest();
    const calls = mockProfileApi();
    renderPage(<DietaryPreferences />);
    await userEvent.click(await allergySection().findByLabelText('Gluten'));
    await userEvent.click(allergySection().getByRole('button', { name: /Lưu dị ứng/ }));
    expect(useUiStore.getState().signupPrompt.open).toBe(true);
    expect(writes(calls)).toHaveLength(0);
  });

  describe('Thành viên', () => {
    beforeEach(() => signInAsMember());

    it('chọn sẵn trường phái và dị ứng đã khai báo', async () => {
      mockProfileApi();
      renderPage(<DietaryPreferences />);
      await pageLoaded();
      expect(await schoolSection().findByLabelText(/Thuần chay/)).toBeChecked();
      expect(await allergySection().findByLabelText('Đậu phộng')).toBeChecked();
      expect(allergySection().getByText('Đã chọn 1/20')).toBeInTheDocument();
    });

    it('lưu dị ứng gửi PUT thay toàn bộ danh sách, ghi chú chỉ gửi khi có', async () => {
      const calls = mockProfileApi((req) =>
        req.method === 'PUT' && req.url === '/users/me/allergies'
          ? { message: 'Cập nhật dị ứng thành công.', data: { allergens: [{ allergenId: 3, name: 'Đậu phộng' }, { allergenId: 2, name: 'Gluten' }] } }
          : undefined
      );
      renderPage(<DietaryPreferences />);
      await pageLoaded();
      await userEvent.click(await allergySection().findByLabelText('Gluten'));
      await userEvent.type(allergySection().getByLabelText('Ghi chú cho Gluten'), 'Đầy bụng');
      await userEvent.click(allergySection().getByRole('button', { name: /Lưu dị ứng/ }));
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          url: '/users/me/allergies',
          body: { allergens: [{ allergenId: 3 }, { allergenId: 2, notes: 'Đầy bụng' }] },
        })
      );
      expect(toastMessages()).toContain('Cập nhật dị ứng thành công.');
    });

    it('tối đa 20 dị ứng: đủ 20 thì khóa các ô còn lại', async () => {
      const catalog = Array.from({ length: 21 }, (_, i) => ({ allergenId: i + 1, code: `A${i + 1}`, allergenName: `Chất ${i + 1}` }));
      const chosen = catalog.slice(0, 20).map((item) => ({ allergenId: item.allergenId, name: item.allergenName }));
      mockProfileApi((req) => (req.url === '/allergens' ? { data: catalog } : undefined), () => me({ allergens: chosen }));
      renderPage(<DietaryPreferences />);
      await pageLoaded();
      expect(await allergySection().findByText('Đã chọn 20/20')).toBeInTheDocument();
      expect(allergySection().getByLabelText('Chất 21')).toBeDisabled();
      expect(allergySection().getByText('Bạn đã chọn tối đa 20 chất dị ứng.')).toBeInTheDocument();
    });

    it('404 ERR_ALLERGEN_NOT_FOUND thì báo không tìm thấy và tải lại danh mục', async () => {
      const calls = mockProfileApi((req) =>
        req.method === 'PUT' ? { status: 404, errorCode: 'ERR_ALLERGEN_NOT_FOUND', message: 'Có chất dị ứng không tồn tại.' } : undefined
      );
      renderPage(<DietaryPreferences />);
      await pageLoaded();
      await userEvent.click(await allergySection().findByLabelText('Gluten'));
      await userEvent.click(allergySection().getByRole('button', { name: /Lưu dị ứng/ }));
      expect(await allergySection().findByText('Không tìm thấy chất dị ứng')).toBeInTheDocument();
      await waitFor(() => expect(calls.filter((c) => c.url === '/allergens')).toHaveLength(2));
    });

    it('đổi trường phái gửi PUT health-profile với số đo hiện có; trường phái kiêng ngũ vị tân thì bật cờ', async () => {
      const calls = mockProfileApi((req) =>
        req.method === 'PUT' && req.url === '/users/me/health-profile'
          ? { message: 'Cập nhật hồ sơ sức khỏe thành công.', data: { ...HEALTH, dietarySchool: { id: 5, code: 'BUDDHIST', name: 'Chay kiêng ngũ vị tân' }, requiresAlliumFree: true } }
          : undefined
      );
      renderPage(<DietaryPreferences />);
      await pageLoaded();
      await userEvent.click(await schoolSection().findByLabelText(/Chay kiêng ngũ vị tân/));
      expect(schoolSection().getByRole('checkbox', { name: /Kiêng ngũ vị tân/ })).toBeChecked();
      await userEvent.click(schoolSection().getByRole('button', { name: /Lưu trường phái/ }));
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          url: '/users/me/health-profile',
          body: {
            heightCm: 162,
            weightKg: 54.5,
            dateOfBirth: '2003-04-12',
            gender: 'FEMALE',
            healthGoal: 'LOSE_WEIGHT',
            targetWeightKg: 52,
            regionPreference: 'SOUTH',
            dietarySchoolId: 5,
            requiresAlliumFree: true,
          },
        })
      );
    });

    it('chưa có hồ sơ sức khỏe thì không lưu được trường phái, dẫn sang trang sức khỏe', async () => {
      mockProfileApi(undefined, () => me({ health: null }));
      renderPage(<DietaryPreferences />);
      await pageLoaded();
      expect(await schoolSection().findByRole('link', { name: 'Lập hồ sơ sức khỏe' })).toHaveAttribute('href', '/me/health');
      expect(schoolSection().getByRole('button', { name: /Lưu trường phái/ })).toBeDisabled();
    });
  });
});
