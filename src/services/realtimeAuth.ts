import * as signalR from '@microsoft/signalr';
import { handleAccountBanned } from '@/api/session';
import { getHubUrl } from '@/lib/env';
import { useAuthStore } from '@/stores/auth.store';

export interface ForceLogoutPayload {
  eventType?: string;
  userId?: number;
  action?: string;
  reason?: string;
  message?: string;
  timestamp?: string;
}

let connection: signalR.HubConnection | null = null;
let isStarting = false;

/**
 * Khởi tạo kết nối SignalR UserHub để lắng nghe sự kiện realtime (ForceLogout khi bị Admin cấm tài khoản).
 */
export function initRealtimeAuth(): () => void {
  const token = useAuthStore.getState().accessToken;
  const user = useAuthStore.getState().user;

  // Chỉ kết nối khi người dùng đã đăng nhập có token
  if (!token || !user) {
    stopRealtimeAuth();
    return () => {};
  }

  // Đã có connection đang chạy hoặc đang kết nối thì không tạo mới
  if (
    connection &&
    (connection.state === signalR.HubConnectionState.Connected ||
      connection.state === signalR.HubConnectionState.Connecting)
  ) {
    return () => {};
  }

  const hubUrl = getHubUrl('/hubs/user');

  try {
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Lắng nghe sự kiện ForceLogout từ UserRealtimeNotifier của Backend
    hubConnection.on('ForceLogout', (payload: ForceLogoutPayload) => {
      const reasonSuffix = payload?.reason ? `. Lý do: ${payload.reason}` : '';
      const message =
        payload?.message ||
        `Tài khoản của bạn đã bị khóa bởi Quản trị viên${reasonSuffix}`;
      handleAccountBanned(message);
    });

    hubConnection.onclose((err) => {
      if (err) {
        // Trường hợp bị máy chủ chủ động ngắt kết nối do blacklist
        const msg = String(err.message || '');
        if (msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')) {
          handleAccountBanned('Tài khoản của bạn đã bị khóa bởi Quản trị viên');
        }
      }
    });

    connection = hubConnection;

    if (!isStarting) {
      isStarting = true;
      hubConnection
        .start()
        .then(() => {
          isStarting = false;
        })
        .catch((err) => {
          isStarting = false;
          // Nếu bị từ chối kết nối ngay từ lúc bắt tay do nằm trong blacklist
          const errMsg = String(err?.message || '');
          if (
            errMsg.includes('403') ||
            errMsg.includes('Stopped during negotiation') ||
            errMsg.includes('Forbidden')
          ) {
            const currentAuth = useAuthStore.getState();
            if (currentAuth.user && currentAuth.accessToken) {
              handleAccountBanned('Tài khoản của bạn đã bị khóa bởi Quản trị viên');
            }
          }
        });
    }
  } catch {
    // Môi trường test không hỗ trợ WebSocket hoặc lỗi khởi tạo hub: bỏ qua
  }

  return () => {
    stopRealtimeAuth();
  };
}

/**
 * Ngắt kết nối SignalR khi người dùng đăng xuất.
 */
export function stopRealtimeAuth(): void {
  if (connection) {
    const conn = connection;
    connection = null;
    isStarting = false;
    try {
      void conn.stop().catch(() => {});
    } catch {
      /* bỏ qua */
    }
  }
}

