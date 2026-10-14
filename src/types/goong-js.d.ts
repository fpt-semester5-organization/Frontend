/**
 * Khai báo kiểu tối thiểu cho @goongmaps/goong-js (gói không kèm TypeScript).
 * Goong JS là bản fork của mapbox-gl v1: chỉ khai báo phần màn bản đồ đang dùng.
 */
declare module '@goongmaps/goong-js' {
  export type LngLatLike = [number, number] | { lng: number; lat: number };

  export interface MapOptions {
    container: HTMLElement | string;
    style: string;
    center?: LngLatLike;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    attributionControl?: boolean;
    cooperativeGestures?: boolean;
  }

  export interface FlyToOptions {
    center?: LngLatLike;
    zoom?: number;
    duration?: number;
    essential?: boolean;
  }

  export interface GeoJSONSourceLike {
    setData(data: object): void;
  }

  export class Map {
    constructor(options: MapOptions);
    on(type: string, listener: (event: { error?: { status?: number; message?: string } }) => void): this;
    once(type: string, listener: () => void): this;
    addControl(control: unknown, position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): this;
    flyTo(options: FlyToOptions): this;
    jumpTo(options: { center?: LngLatLike; zoom?: number }): this;
    resize(): this;
    remove(): void;
    loaded(): boolean;
    isStyleLoaded(): boolean;
    addSource(id: string, source: { type: 'geojson'; data: object }): this;
    getSource(id: string): GeoJSONSourceLike | undefined;
    addLayer(layer: Record<string, unknown>): this;
    getLayer(id: string): unknown;
  }

  export class Marker {
    constructor(options?: { element?: HTMLElement; anchor?: string });
    setLngLat(lngLat: LngLatLike): this;
    addTo(map: Map): this;
    remove(): this;
  }

  export class NavigationControl {
    constructor(options?: { showCompass?: boolean; showZoom?: boolean });
  }

  const goongjs: {
    accessToken: string;
    supported(options?: { failIfMajorPerformanceCaveat?: boolean }): boolean;
    Map: typeof Map;
    Marker: typeof Marker;
    NavigationControl: typeof NavigationControl;
  };
  export default goongjs;
}
