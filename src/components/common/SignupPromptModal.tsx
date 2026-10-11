import { useGuestStore } from '../../stores/guest.store';
import { Link } from 'react-router-dom';

export const SignupPromptModal = () => {
  const { isPromptOpen, closePrompt } = useGuestStore();

  if (!isPromptOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Mở khóa tính năng</h3>
        <p className="text-gray-600 mb-6">Đăng ký thành viên để sử dụng không giới hạn các tính năng của VeggieLife.</p>
        <div className="flex space-x-3">
          <Link to="/register" onClick={closePrompt} className="flex-1 bg-green-600 text-white text-center py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
            Đăng ký ngay
          </Link>
          <button onClick={closePrompt} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};
