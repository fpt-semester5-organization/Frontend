/**
 * Khai báo kiểu cho @goongmaps/goong-js (gói không kèm TypeScript).
 * Goong JS là bản fork của mapbox-gl v1: khai báo các phần bản đồ, marker, popup, fitBounds.
 */
declare module '@goongmaps/goong-js' {
  export type LngLatLike = [number, number] | { lng: number; lat: number };
  export type LngLatBoundsLike =
    | [LngLatLike, LngLatLike]
    | [number, number, number, number]
    | [[number, number], [number, number]];

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

  export interface EaseToOptions {
    center?: LngLatLike;
    zoom?: number;
    duration?: number;
    offset?: [number, number];
  }

  export interface FitBoundsOptions {
    padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
    maxZoom?: number;
    duration?: number;
    offset?: [number, number];
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
    easeTo(options: EaseToOptions): this;
    fitBounds(bounds: LngLatBoundsLike, options?: FitBoundsOptions): this;
    jumpTo(options: { center?: LngLatLike; zoom?: number }): this;
    resize(): this;
    remove(): void;
    loaded(): boolean;
    isStyleLoaded(): boolean;
    getZoom(): number;
    getCenter(): { lng: number; lat: number };
    addSource(id: string, source: { type: 'geojson'; data: object }): this;
    getSource(id: string): GeoJSONSourceLike | undefined;
    addLayer(layer: Record<string, unknown>): this;
    getLayer(id: string): unknown;
  }

  export interface PopupOptions {
    closeButton?: boolean;
    closeOnClick?: boolean;
    anchor?: string;
    offset?: number | [number, number] | Record<string, [number, number]>;
    className?: string;
  }

  export class Popup {
    constructor(options?: PopupOptions);
    addTo(map: Map): this;
    remove(): this;
    isOpen(): boolean;
    setLngLat(lngLat: LngLatLike): this;
    setText(text: string): this;
    setHTML(html: string): this;
    setDOMContent(htmlNode: Node): this;
  }

  export class Marker {
    constructor(options?: { element?: HTMLElement; anchor?: string });
    setLngLat(lngLat: LngLatLike): this;
    addTo(map: Map): this;
    remove(): this;
    setPopup(popup?: Popup): this;
    getPopup(): Popup | undefined;
    togglePopup(): this;
  }

  export class NavigationControl {
    constructor(options?: { showCompass?: boolean; showZoom?: boolean });
  }

  const goongjs: {
    accessToken: string;
    supported(options?: { failIfMajorPerformanceCaveat?: boolean }): boolean;
    Map: typeof Map;
    Marker: typeof Marker;
    Popup: typeof Popup;
    NavigationControl: typeof NavigationControl;
  };
  export default goongjs;
}
