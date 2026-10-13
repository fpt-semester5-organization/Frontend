import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useUiStore } from '@/stores/ui.store';

/**
 * Mời Khách đăng ký/đăng nhập khi bấm thao tác dành cho Thành viên, gặp 403 ERR_GUEST_*
 * hoặc hết hạn mức dùng thử; giữ returnUrl để quay lại sau khi xác thực (BR-GUEST-AUTH-01, UI-5).
 */
export const SignupPromptModal: React.FC = () => {
  const { open, returnUrl } = useUiStore((state) => state.signupPrompt);
  const close = useUiStore((state) => state.closeSignupPrompt);

  return (
    <Modal show={open} onHide={close} bare size="sm" labelledBy="signup-prompt-title">
      <div className="flex flex-col items-center gap-space-md p-space-lg text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-on-primary">
          <Icon name="lock_open" />
        </span>
        <h2 id="signup-prompt-title" className="font-headline-sm text-headline-sm text-primary">
          Đăng ký để tiếp tục
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Tính năng này dành cho thành viên. Tạo tài khoản miễn phí để thả tim, bình luận, đăng bài và dùng các tính năng
          dinh dưỡng cá nhân.
        </p>
        <div className="flex w-full flex-col gap-space-sm">
          <Link
            to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)}
            onClick={close}
            className="rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
          >
            Đăng ký miễn phí
          </Link>
          <Link
            to={withReturnUrl(PATHS.AUTH.LOGIN, returnUrl)}
            onClick={close}
            className="rounded-lg bg-surface-container px-4 py-2.5 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high"
          >
            Tôi đã có tài khoản
          </Link>
          <Link
            to={PATHS.SUBSCRIPTION.PRICING}
            onClick={close}
            className="font-label-sm text-label-sm text-secondary no-underline hover:underline"
          >
            Xem quyền lợi gói VIP
          </Link>
        </div>
      </div>
    </Modal>
  );
};
