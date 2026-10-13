import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { PATHS } from '@/routes/paths';
import { useUiStore } from '@/stores/ui.store';

const COPY = {
  guest: { title: 'Đăng ký để tiếp tục', body: 'Tính năng này dành cho thành viên. Tạo tài khoản miễn phí để lưu công thức, lập thực đơn và hỏi trợ lý AI.' },
  quota: { title: 'Bạn đã dùng hết lượt dùng thử', body: 'Khách được dùng thử có hạn mức. Đăng ký thành viên để tiếp tục, hoặc nâng cấp VIP để mở rộng hạn mức.' },
  personalization: { title: 'Cần đăng nhập để cá nhân hóa', body: 'Hồ sơ sức khỏe, dị ứng và thực đơn riêng chỉ có cho tài khoản thành viên.' },
} as const;

/** Mời Khách đăng ký/đăng nhập (spec 13 §1.1: 403 ERR_GUEST_* / ERR_QUOTA_*). Lưu `returnUrl` để quay lại sau khi đăng nhập. */
export function SignupPromptModal() {
  const { open, reason, returnUrl } = useUiStore((s) => s.signupPrompt);
  const close = useUiStore((s) => s.closeSignupPrompt);
  const copy = COPY[reason];
  const state = { returnUrl };
  return (
    <Modal show={open} onHide={close} bare size="sm">
      <div className="flex flex-col items-center gap-space-md p-space-lg text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-on-primary">
          <span className="material-symbols-outlined">lock_open</span>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-primary">{copy.title}</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{copy.body}</p>
        <div className="flex w-full flex-col gap-space-sm">
          <Link to={PATHS.AUTH.REGISTER} state={state} onClick={close} className="rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary">
            Đăng ký miễn phí
          </Link>
          <Link to={PATHS.AUTH.LOGIN} state={state} onClick={close} className="rounded-lg bg-surface-container px-4 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
            Tôi đã có tài khoản
          </Link>
          <Link to={PATHS.VIP.ROOT} onClick={close} className="font-label-sm text-label-sm text-secondary hover:underline">
            Xem quyền lợi gói VIP
          </Link>
        </div>
      </div>
    </Modal>
  );
}
