import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../api/auth.api';
import { useAuthStore } from '../../../stores/auth.store';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự'),
});

export const ChangePassword = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      alert("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      clearAuth();
      navigate('/login');
    }
  });

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Đổi mật khẩu</h2>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as any))} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
          <input type="password" {...register('currentPassword')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" />
          {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
          <input type="password" {...register('newPassword')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" />
          {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message as string}</p>}
        </div>
        <button type="submit" disabled={mutation.isPending} className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
          {mutation.isPending ? 'Đang xử lý...' : 'Cập nhật'}
        </button>
      </form>
    </div>
  );
};
