import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useUiStore } from '@/stores/ui.store';
import { PATHS } from '@/routes/paths';

export const BannedAccountModal: React.FC = () => {
  const { open, message } = useUiStore((s) => s.bannedModal);
  const close = useUiStore((s) => s.closeBannedModal);
  const navigate = useNavigate();

  const handleConfirm = () => {
    close();
    navigate(PATHS.AUTH.LOGIN, { replace: true });
  };

  return (
    <Modal show={open} onHide={handleConfirm} title="Thông báo tài khoản" locked>
      <div className="flex flex-col items-center gap-space-md p-space-lg text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/15 text-error">
          <Icon name="block" className="text-[36px]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            Tài khoản đã bị khóa
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            {message || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.'}
          </p>
        </div>
        <div className="mt-space-sm flex justify-center w-full">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto min-w-[140px] rounded-lg bg-primary px-6 py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm hover:opacity-90 transition-opacity"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </Modal>
  );
};
