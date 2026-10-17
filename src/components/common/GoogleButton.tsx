import { GoogleLogin } from '@react-oauth/google';
import { useLoginWithGoogle } from '@/features/auth/hooks/useAuth';
import { toast } from '@/stores/ui.store';
import { apiErrorCode, apiErrorMessage } from '@/api/http';

/** Đăng nhập/đăng ký bằng Google (FN-AUTH-07, POST /auth/google). */
export function GoogleButton({ label }: { label?: string }) {
  const googleLogin = useLoginWithGoogle();

  const handleSuccess = (credentialResponse: { credential?: string }) => {
    if (!credentialResponse?.credential) {
      toast.error('Không nhận được mã xác thực từ Google.');
      return;
    }

    const idToken = credentialResponse.credential;
    googleLogin.mutate(
      { idToken },
      {
        onError: (err) => {
          const code = apiErrorCode(err);
          if (code === 'ERR_AUTH_ACCOUNT_LINK_REQUIRED') {
            const password = window.prompt(
              'Email này đã có tài khoản mật khẩu. Vui lòng nhập mật khẩu hiện tại để liên kết Google:'
            );
            if (password) {
              googleLogin.mutate({ idToken, currentPassword: password });
            }
            return;
          }
          toast.error(apiErrorMessage(err));
        },
      }
    );
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = clientId && !clientId.startsWith('your_');

  if (!isConfigured) {
    return (
      <button
        type="button"
        onClick={() => {
          googleLogin.mutate(
            { idToken: 'dev-google-token' },
            {
              onError: (err) => toast.error(apiErrorMessage(err)),
            }
          );
        }}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-surface-container-lowest px-space-md py-3 font-label-md text-label-md text-on-surface shadow-sm ring-1 ring-surface-container-highest transition-colors hover:bg-surface-container-low"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
        </svg>
        {label || 'Tiếp tục với Google'}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center justify-center overflow-hidden py-1">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Đăng nhập Google thất bại hoặc bạn đã hủy cửa sổ đăng nhập.')}
        text="continue_with"
        shape="rectangular"
        size="large"
        width="100%"
        locale="vi"
      />
    </div>
  );
}
