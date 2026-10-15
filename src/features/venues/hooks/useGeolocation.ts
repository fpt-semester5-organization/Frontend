import { useCallback, useEffect, useState } from 'react';
import { roundCoord } from '../lib/geo';
import type { LatLng } from '../types/venues.types';

export type GeoStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

/**
 * Vị trí GPS qua Geolocation API của trình duyệt (NFR HI-2), chỉ hỏi khi người dùng bấm (BR-AUTH-002).
 * Tọa độ chỉ nằm trong state của trang: không lưu storage, không đưa lên URL, rời trang là mất.
 */
export function useGeolocation() {
  const [state, setState] = useState<{ status: GeoStatus; coords: LatLng | null }>({ status: 'idle', coords: null });
  /** Quyền đã cấp từ trước (granted) hoặc đã chặn (denied); 'prompt' là trình duyệt sẽ hỏi. */
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    let status: PermissionStatus | null = null;
    const onChange = () => status && setPermission(status.state);
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        status = result;
        setPermission(result.state);
        result.addEventListener('change', onChange);
      })
      .catch(() => setPermission('unknown'));
    return () => status?.removeEventListener('change', onChange);
  }, []);

  const request = useCallback(() => {
    // Geolocation chỉ chạy trên HTTPS hoặc localhost.
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      setState({ status: 'unsupported', coords: null });
      return;
    }
    setState({ status: 'locating', coords: null });
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setState({
          status: 'ready',
          coords: { lat: roundCoord(position.coords.latitude), lng: roundCoord(position.coords.longitude) },
        }),
      (error) =>
        setState({
          status:
            error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable',
          coords: null,
        }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { ...state, permission, request };
}
