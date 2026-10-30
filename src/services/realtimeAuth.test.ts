// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as signalR from '@microsoft/signalr';
import { initRealtimeAuth, stopRealtimeAuth } from './realtimeAuth';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { registerRouterNavigator } from '@/api/session';
import { PATHS } from '@/routes/paths';

const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
let closeHandler: ((err?: Error) => void) | null = null;

const mockConnection = {
  state: 'Disconnected',
  on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
    handlers[event] = handlers[event] || [];
    handlers[event].push(callback);
  }),
  onclose: vi.fn((cb: (err?: Error) => void) => {
    closeHandler = cb;
  }),
  start: vi.fn().mockImplementation(() => {
    mockConnection.state = 'Connected';
    return Promise.resolve();
  }),
  stop: vi.fn().mockImplementation(() => {
    mockConnection.state = 'Disconnected';
    return Promise.resolve();
  }),
};

vi.mock('@microsoft/signalr', () => {
  class MockHubConnectionBuilder {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return mockConnection;
    }
  }

  return {
    HubConnectionBuilder: MockHubConnectionBuilder,
    LogLevel: { Warning: 2 },
    HttpTransportType: { WebSockets: 1, LongPolling: 4 },
    HubConnectionState: {
      Disconnected: 'Disconnected',
      Connecting: 'Connecting',
      Connected: 'Connected',
    },
  };
});

describe('realtimeAuth - Lắng nghe sự kiện SignalR ForceLogout', () => {
  const mockNavigator = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockNavigator.mockClear();
    registerRouterNavigator(mockNavigator);
    stopRealtimeAuth();

    Object.keys(handlers).forEach((k) => delete handlers[k]);
    mockConnection.start.mockClear();
    mockConnection.stop.mockClear();
    mockConnection.on.mockClear();
    mockConnection.state = 'Disconnected';

    useAuthStore.setState({
      user: null,
      accessToken: null,
      token: null,
      isAuthenticated: false,
    });
    useUiStore.setState({
      toasts: [],
      bannedModal: { open: false, message: '' },
    });
  });

  it('không khởi tạo SignalR nếu chưa đăng nhập (không có user/token)', () => {
    initRealtimeAuth();
    expect(mockConnection.start).not.toHaveBeenCalled();
  });

  it('khởi tạo kết nối khi đã đăng nhập và xử lý sự kiện ForceLogout khi Admin cấm tài khoản', async () => {
    useAuthStore.setState({
      user: {
        userId: 300,
        fullName: 'Nguyễn Văn Vi Phạm',
        email: 'banned@veggielife.vn',
        role: 'MEMBER',
        isVip: false,
      },
      accessToken: 'member-jwt-token',
      token: 'member-jwt-token',
      isAuthenticated: true,
    });
    window.localStorage.setItem('vl_access_token', 'member-jwt-token');

    initRealtimeAuth();

    expect(mockConnection.start).toHaveBeenCalled();

    // Giả lập server Backend gửi event ForceLogout tới client
    const forceLogoutHandler = handlers['ForceLogout']?.[0];
    expect(forceLogoutHandler).toBeDefined();

    forceLogoutHandler({
      eventType: 'FORCE_LOGOUT',
      userId: 300,
      action: 'BAN',
      reason: 'Vi phạm quy tắc cộng đồng nhiều lần',
      message: 'Tài khoản của bạn đã bị quản trị viên khóa hoặc cấm. Phiên làm việc đã bị thu hồi ngay lập tức.',
    });

    // 1. Token trong localStorage bị dọn sạch
    expect(window.localStorage.getItem('vl_access_token')).toBeNull();

    // 2. Auth store logout
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // 3. Tự động điều hướng về /login
    expect(mockNavigator).toHaveBeenCalledWith(PATHS.AUTH.LOGIN, expect.objectContaining({
      replace: true,
      state: expect.objectContaining({ banned: true }),
    }));

    // 4. Modal và Toast thông báo được kích hoạt
    expect(useUiStore.getState().bannedModal.open).toBe(true);
    expect(useUiStore.getState().toasts.length).toBeGreaterThan(0);
  });
});
