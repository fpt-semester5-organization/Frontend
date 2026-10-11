import React from 'react';
import Modal from 'react-bootstrap/Modal';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useUiStore } from '@/stores/ui.store';

/**
 * Mời Khách đăng ký/đăng nhập khi bấm thao tác dành cho Thành viên, gặp 403 ERR_GUEST_*
 * hoặc hết hạn mức dùng thử; giữ returnUrl để quay lại sau khi xác thực (BR-GUEST-AUTH-01, UI-5).
 */
export const SignupPromptModal: React.FC = () => {
  const { open, returnUrl } = useUiStore((state) => state.signupPrompt);
  const close = useUiStore((state) => state.closeSignupPrompt);

  const linkClass =
    'inline-flex h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

  return (
    <Modal show={open} onHide={close} centered aria-labelledby="signup-prompt-title">
      <Modal.Header closeButton closeLabel="Đóng" className="border-0 pb-0" />
      <Modal.Body className="px-6 pt-0 pb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <Leaf className="h-6 w-6 text-brand-700" aria-hidden="true" />
        </span>
        <h2 id="signup-prompt-title" className="mt-3 text-lg font-semibold text-gray-900">
          Tham gia cộng đồng VeggieLife
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Đăng ký miễn phí để thả tim, bình luận, đăng bài và dùng các tính năng dinh dưỡng cá nhân.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)}
            onClick={close}
            className={`${linkClass} bg-brand-600 text-white hover:bg-brand-700`}
          >
            Đăng ký
          </Link>
          <Link
            to={withReturnUrl(PATHS.AUTH.LOGIN, returnUrl)}
            onClick={close}
            className={`${linkClass} bg-white text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50`}
          >
            Đăng nhập
          </Link>
        </div>
      </Modal.Body>
    </Modal>
  );
};
