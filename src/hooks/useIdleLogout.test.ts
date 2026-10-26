import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdleLogout } from './useIdleLogout';

describe('useIdleLogout (BR-ADM-SYS-003, SEC-13, UI-9)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tự động gọi onTimeout sau đúng 30 phút không có thao tác', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleLogout(onTimeout, 30));

    // Chưa hết 30 phút (29 phút 59 giây)
    act(() => {
      vi.advanceTimersByTime(29 * 60_000 + 59_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Đúng mốc 30 phút
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('reset bộ đếm khi người dùng có tương tác chuột, bàn phím hoặc chạm', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleLogout(onTimeout, 30));

    // Trôi qua 25 phút
    act(() => {
      vi.advanceTimersByTime(25 * 60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Người dùng di chuyển chuột (mousemove)
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });

    // Trôi qua thêm 10 phút (tổng 35 phút từ đầu, nhưng mới 10 phút từ lúc di chuột)
    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Người dùng nhấn phím (keydown)
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });

    // Trôi qua thêm 29 phút
    act(() => {
      vi.advanceTimersByTime(29 * 60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Trôi qua thêm 1 phút nữa (đủ 30 phút từ lần phím cuối)
    act(() => {
      vi.advanceTimersByTime(1 * 60_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('hủy timer và dọn dẹp event listener khi unmount', () => {
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() => useIdleLogout(onTimeout, 30));

    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });

    unmount();

    // Trôi tiếp 30 phút nữa sau khi đã unmount
    act(() => {
      vi.advanceTimersByTime(30 * 60_000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
