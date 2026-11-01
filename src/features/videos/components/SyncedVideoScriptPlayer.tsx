import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { TranscriptSegment } from '../types/transcript.types';
import type { ExtractedRecipe } from '../types/video.types';

export interface SyncedVideoScriptPlayerProps {
  videoUrl?: string | null;
  posterUrl?: string | null;
  title?: string;
  segments: TranscriptSegment[];
  recipe?: ExtractedRecipe | null;
  rawTranscript?: string | null;
  autoPlay?: boolean;
  className?: string;
  onClose?: () => void;
  onDurationChange?: (duration: number) => void;
  subtitleSource?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function decodeUnicodeEscapes(str: string): string {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
  } catch {
    return str;
  }
}

function cleanStepText(step: string): string {
  let s = decodeUnicodeEscapes(step).trim();
  s = s.replace(/^["']|["']$/g, '').trim();
  s = s.replace(/^(?:bước|b|step)\s*\d+[:.\-\s]*/i, '');
  s = s.replace(/^[-•*]\s*/, '').replace(/^[0-9]+[.)]\s*/, '').trim();
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

function flattenSteps(rawSteps: string[]): string[] {
  if (!rawSteps || rawSteps.length === 0) return [];
  const flattened: string[] = [];

  for (const item of rawSteps) {
    if (!item) continue;
    const str = String(item).trim();

    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          for (const sub of parsed) {
            const cleaned = cleanStepText(String(sub));
            if (cleaned) flattened.push(cleaned);
          }
          continue;
        }
      } catch {
        const matches = str.match(/"([^"]+)"|'([^']+)'/g);
        if (matches && matches.length > 0) {
          for (const m of matches) {
            const cleaned = cleanStepText(m.replace(/^['"]|['"]$/g, ''));
            if (cleaned) flattened.push(cleaned);
          }
          continue;
        }
      }
    }

    const cleaned = cleanStepText(str);
    if (cleaned) {
      flattened.push(cleaned);
    }
  }

  return flattened;
}

export interface ResolvedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export function resolveIngredientAmount(ing: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
}): ResolvedIngredient {
  const cleanName = decodeUnicodeEscapes(ing.name || '').trim().replace(/\.+$/, '');
  const lower = cleanName.toLowerCase();

  let qty = ing.quantity != null && ing.quantity > 0 ? Number(ing.quantity) : null;
  let unit = ing.unit ? ing.unit.trim() : null;

  if (qty == null || !unit) {
    if (lower.includes('bún') || lower.includes('phở') || lower.includes('mì') || lower.includes('miến') || lower.includes('hủ tiếu') || lower.includes('bánh canh')) {
      qty = qty ?? 500;
      unit = unit || 'g';
    } else if (lower.includes('cơm') || lower.includes('gạo')) {
      qty = qty ?? 300;
      unit = unit || 'g';
    } else if (lower.includes('đậu hũ') || lower.includes('đậu phụ') || lower.includes('tàu hũ') || lower.includes('đậu hủ')) {
      qty = qty ?? 200;
      unit = unit || 'g';
    } else if (lower.includes('nấm')) {
      qty = qty ?? 150;
      unit = unit || 'g';
    } else if (lower.includes('nước dùng') || lower.includes('nước lèo') || lower.includes('nước hầm') || lower.includes('nước sôi') || lower.includes('nước dừa')) {
      qty = qty ?? 1.5;
      unit = unit || 'lít';
    } else if (lower.includes('rau củ') || lower.includes('cà rốt') || lower.includes('củ cải') || lower.includes('su hào') || lower.includes('bí đỏ') || lower.includes('khoai tây') || lower.includes('khoai lang')) {
      qty = qty ?? 200;
      unit = unit || 'g';
    } else if (lower.includes('rau thơm') || lower.includes('hành lá') || lower.includes('ngò') || lower.includes('mùi tàu') || lower.includes('húng quế')) {
      qty = qty ?? 50;
      unit = unit || 'g';
    } else if (lower.includes('rau') || lower.includes('xà lách') || lower.includes('giá đỗ') || lower.includes('bắp cải')) {
      qty = qty ?? 150;
      unit = unit || 'g';
    } else if (lower.includes('gia vị') || lower.includes('hạt nêm') || lower.includes('đường') || lower.includes('muối') || lower.includes('tiêu') || lower.includes('bột ngọt')) {
      qty = qty ?? 2;
      unit = unit || 'thìa cà phê';
    } else if (lower.includes('nước mắm') || lower.includes('nước tương') || lower.includes('xì dầu') || lower.includes('dầu ăn') || lower.includes('dầu hào')) {
      qty = qty ?? 2;
      unit = unit || 'muỗng canh';
    } else if (lower.includes('ớt')) {
      qty = qty ?? 2;
      unit = unit || 'trái';
    } else if (lower.includes('sả') || lower.includes('gừng') || lower.includes('tỏi') || lower.includes('hành tím')) {
      qty = qty ?? 2;
      unit = unit || 'nhánh';
    } else {
      qty = qty ?? 150;
      unit = unit || 'g';
    }
  }

  return {
    name: cleanName,
    quantity: qty,
    unit: unit,
  };
}

function formatIngredientText(ing: { name: string; quantity?: number | null; unit?: string | null }): string {
  const resolved = resolveIngredientAmount(ing);
  return `${resolved.quantity} ${resolved.unit} ${resolved.name}.`;
}

interface StepGroup {
  groupTitle: string;
  items: string[];
}

function organizeSteps(steps: string[]): StepGroup[] {
  const normalized = flattenSteps(steps);
  if (!normalized || normalized.length === 0) return [];

  const prepSteps: string[] = [];
  const cookSteps: string[] = [];

  let currentGroup = 'prep';
  for (const cleanStep of normalized) {
    const lower = cleanStep.toLowerCase();
    if (
      lower.includes('thực hiện') ||
      lower.includes('chế biến') ||
      lower.includes('bước 2') ||
      lower.includes('nấu') ||
      lower.includes('xào') ||
      lower.includes('phi thơm') ||
      lower.includes('đun sôi') ||
      lower.includes('luộc') ||
      lower.includes('kho')
    ) {
      currentGroup = 'cook';
    }
    if (currentGroup === 'prep') {
      prepSteps.push(cleanStep);
    } else {
      cookSteps.push(cleanStep);
    }
  }

  if (prepSteps.length > 0 && cookSteps.length > 0) {
    return [
      { groupTitle: '1. Chuẩn bị', items: prepSteps },
      { groupTitle: '2. Thực hiện', items: cookSteps },
    ];
  }

  if (normalized.length >= 3) {
    const mid = Math.ceil(normalized.length / 3);
    return [
      { groupTitle: '1. Chuẩn bị', items: normalized.slice(0, mid) },
      { groupTitle: '2. Thực hiện', items: normalized.slice(mid) },
    ];
  }

  return [{ groupTitle: '1. Hướng dẫn thực hiện', items: normalized }];
}

export const SyncedVideoScriptPlayer: React.FC<SyncedVideoScriptPlayerProps> = ({
  videoUrl,
  posterUrl,
  title,
  segments,
  recipe,
  rawTranscript,
  autoPlay = false,
  className,
  onClose,
  onDurationChange,
  subtitleSource,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userAutoScroll, setUserAutoScroll] = useState(true);
  const [showScript, setShowScript] = useState(true);
  const [activeTab, setActiveTab] = useState<'recipe' | 'transcript'>('recipe');

  const stepGroups = organizeSteps(recipe?.steps ?? []);

  // Tìm segment đang khớp với currentTime
  const activeIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  // Tự động cuộn theo dòng thoại đang đọc
  useEffect(() => {
    if (!userAutoScroll || activeIndex === -1) return;
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeIndex, userAutoScroll]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 0;
    setDuration(dur);
    if (dur > 0) {
      onDurationChange?.(dur);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(percent * duration);
  };

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden bg-surface-container-low border border-surface-container text-on-surface select-none shadow-sm',
        className
      )}
    >
      {/* Container chính: Bố cục tự co giãn khi bật/tắt tóm tắt */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[300px] sm:min-h-[340px] md:min-h-[380px] transition-all">
        {/* ===================== CỘT VIDEO PLAYER ===================== */}
        <div
          className={cn(
            'relative flex flex-col justify-between bg-inverse-surface transition-all duration-300',
            showScript ? 'md:col-span-7' : 'md:col-span-12'
          )}
        >
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl || undefined}
              poster={posterUrl || undefined}
              playsInline
              preload="metadata"
              autoPlay={autoPlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="h-full w-full object-contain cursor-pointer aspect-video bg-black"
            />

            {/* Nút Play to ở giữa */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Phát video"
                className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-on-primary shadow-xl backdrop-blur-xs transition-all hover:scale-110 hover:bg-primary active:scale-95 cursor-pointer z-10"
              >
                <Icon name="play_arrow" className="text-[32px] ml-0.5" />
              </button>
            )}

            {/* Nút nhỏ góc trên bên phải để mở lại tóm tắt khi đang ẩn */}
            {!showScript && (
              <button
                type="button"
                onClick={() => setShowScript(true)}
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-inverse-surface/85 px-3 py-1 font-label-sm text-label-sm font-medium text-inverse-on-surface shadow-md backdrop-blur-md hover:bg-inverse-surface border border-outline/30 transition-all cursor-pointer"
                title="Mở bảng tóm tắt video"
              >
                <Icon name="auto_awesome" className="text-[16px] text-primary-fixed" />
                <span>Xem tóm tắt</span>
              </button>
            )}

            {/* Phụ đề tức thời hiển thị nổi dưới đáy video */}
            {activeIndex !== -1 && (
              <div className="pointer-events-none absolute bottom-12 inset-x-3 text-center z-10">
                <span className="inline-block max-w-[90%] rounded-lg bg-inverse-surface/90 px-3.5 py-1.5 font-label-md text-label-md font-medium text-inverse-on-surface shadow-md backdrop-blur-sm border border-outline/20">
                  {segments[activeIndex].text}
                </span>
              </div>
            )}
          </div>

          {/* Thanh điều khiển video */}
          <div className="flex flex-col bg-gradient-to-t from-inverse-surface via-inverse-surface/80 to-transparent p-2.5 gap-1.5">
            {/* Thanh tiến trình */}
            <div
              onClick={handleProgressClick}
              role="slider"
              tabIndex={0}
              aria-label="Tua thời gian video"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration || 100}
              className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 hover:h-2 transition-all"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between font-label-sm text-label-sm font-mono text-inverse-on-surface/90">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded p-1 hover:bg-white/10 transition-colors cursor-pointer"
                  title={isPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded p-1 hover:bg-white/10 transition-colors cursor-pointer"
                  title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                >
                  <Icon name={isMuted ? 'volume_off' : 'volume_up'} className="text-[18px]" />
                </button>
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* NÚT BẬT/TẮT TÓM TẮT TRỰC TIẾP TRÊN TRÌNH PHÁT (Không quay về ảnh ban đầu) */}
                <button
                  type="button"
                  onClick={() => setShowScript(!showScript)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-0.5 font-sans font-medium transition-colors cursor-pointer',
                    showScript
                      ? 'bg-primary-container text-on-primary hover:bg-primary-container/90'
                      : 'bg-white/15 text-white/90 hover:bg-white/25'
                  )}
                  title={showScript ? 'Ẩn khung tóm tắt (phóng to video)' : 'Hiện khung tóm tắt'}
                >
                  <Icon name={showScript ? 'vertical_split' : 'view_sidebar'} className="text-[16px]" />
                  <span>{showScript ? 'Ẩn tóm tắt' : 'Hiện tóm tắt'}</span>
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1 rounded-md px-2 py-0.5 text-inverse-on-surface/75 hover:text-inverse-on-surface hover:bg-white/10 transition-colors cursor-pointer font-sans text-label-sm"
                    title="Đóng video và quay về ảnh ban đầu"
                  >
                    <Icon name="close" className="text-[16px]" />
                    <span>Đóng</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== CỘT PHẢI: KHUNG TÓM TẮT VIDEO ===================== */}
        {showScript && (
          <div className="flex flex-col bg-surface-container-lowest text-on-surface border-t md:border-t-0 md:border-l border-surface-container md:col-span-5 relative overflow-hidden transition-all duration-300">
            {/* Header tóm tắt video kèm 2 Tab chuyển đổi */}
            <div className="flex items-center justify-between border-b border-surface-container px-3 py-2 bg-surface-container-low/70">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('recipe')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-label-sm text-label-sm font-semibold transition-all cursor-pointer',
                    activeTab === 'recipe'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  )}
                >
                  <Icon name="menu_book" className="text-[16px]" />
                  <span>Công thức tóm tắt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('transcript')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-label-sm text-label-sm font-semibold transition-all cursor-pointer',
                    activeTab === 'transcript'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  )}
                >
                  <Icon name="subtitles" className="text-[16px]" />
                  <span>Lời thoại ({segments.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeTab === 'transcript' && (
                  <button
                    type="button"
                    onClick={() => setUserAutoScroll(!userAutoScroll)}
                    title={userAutoScroll ? 'Đang tự cuộn theo lời thoại' : 'Đã tắt tự cuộn'}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold transition-colors cursor-pointer',
                      userAutoScroll
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        userAutoScroll ? 'bg-primary animate-pulse' : 'bg-outline'
                      )}
                    />
                    Cuộn
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowScript(false)}
                  className="rounded-md p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Thu gọn khung tóm tắt"
                >
                  <Icon name="chevron_right" className="text-[18px]" />
                </button>
              </div>
            </div>

            {/* TAB 1: HIỂN THỊ CÔNG THỨC */}
            {activeTab === 'recipe' && (
              <div
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 max-h-[360px] md:max-h-[420px] scroll-smooth bg-surface-container-lowest font-sans select-text"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--color-surface-container-highest) transparent',
                }}
              >
                {/* Dòng Khẩu phần & Thời gian */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2 border border-surface-container font-label-sm text-label-sm">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <Icon name="group" className="text-[16px] text-primary" />
                    <span>Khẩu phần:</span>
                    <span className="font-semibold text-on-surface">
                      {recipe?.servings ? `${recipe.servings} người` : '2 người'}
                    </span>
                  </div>
                  <span className="text-outline-variant select-none">•</span>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <Icon name="timer" className="text-[16px] text-primary" />
                    <span>Thời gian:</span>
                    <span className="font-semibold text-on-surface">
                      {recipe?.cookTimeMinutes ? `${recipe.cookTimeMinutes} phút` : '15 phút'}
                    </span>
                  </div>
                </div>

                {/* KHỐI NGUYÊN LIỆU: */}
                <div>
                  <h4 className="font-label-md text-label-md font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                    <Icon name="kitchen" className="text-[16px]" />
                    <span>Nguyên liệu</span>
                  </h4>
                  {!recipe?.ingredients || recipe.ingredients.length === 0 ? (
                    <div className="py-2 font-body-sm text-body-sm text-on-surface-variant italic">
                      {segments.length > 0
                        ? 'Đang trích xuất danh sách nguyên liệu từ video...'
                        : 'Chưa có thông tin nguyên liệu.'}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5 pl-1">
                      {recipe.ingredients.map((ing, idx) => {
                        const resolved = resolveIngredientAmount(ing);
                        return (
                          <li key={idx} className="flex items-start gap-2 font-body-sm text-body-sm leading-relaxed text-on-surface">
                            <span className="text-primary font-bold text-base select-none leading-none mt-0.5">
                              •
                            </span>
                            <span className="min-w-0">
                              <span className="font-semibold text-primary mr-1.5 inline-block">
                                {resolved.quantity} {resolved.unit}
                              </span>
                              <span className="font-medium text-on-surface">{resolved.name}.</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* KHỐI CÁCH LÀM: */}
                <div>
                  <h4 className="font-label-md text-label-md font-bold uppercase tracking-wider text-primary mt-1 mb-2 flex items-center gap-1.5">
                    <Icon name="soup_kitchen" className="text-[16px]" />
                    <span>Cách làm</span>
                  </h4>
                  {stepGroups.length === 0 ? (
                    <div className="py-2 font-body-sm text-body-sm text-on-surface-variant italic">
                      {segments.length > 0
                        ? 'Đang tóm tắt các bước thực hiện...'
                        : 'Chưa có hướng dẫn thực hiện.'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {stepGroups.map((grp, gIdx) => (
                        <div key={gIdx} className="flex flex-col gap-2">
                          <h5 className="font-label-md text-label-md font-bold text-on-surface">
                            {grp.groupTitle}
                          </h5>
                          <ol className="flex flex-col gap-2 pl-0.5">
                            {grp.items.map((step, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2 font-body-sm text-body-sm leading-relaxed text-on-surface">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-mono text-label-sm font-bold text-on-primary-fixed mt-0.5">
                                  {sIdx + 1}
                                </span>
                                <span className="min-w-0 flex-1 pt-0.5">
                                  {step.endsWith('.') ? step : `${step}.`}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* KHỐI MẸO NHỎ / LƯU Ý */}
                <div className="flex items-start gap-2.5 rounded-xl border border-secondary-fixed bg-secondary-fixed/30 p-2.5 my-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary mt-0.5">
                    <Icon name="lightbulb" className="text-[14px]" />
                  </span>
                  <div className="font-body-sm text-body-sm leading-relaxed text-on-surface">
                    <span className="font-semibold text-secondary">Mẹo: </span>
                    <span>
                      {recipe?.tips?.[0]?.replace(/^mẹo[:\s-]*/i, '') ||
                        'Nên nấu với lửa nhỏ để nguyên liệu thấm đều gia vị và giữ được màu sắc tươi ngon tự nhiên của món chay.'}
                    </span>
                  </div>
                </div>

                {/* Chân trang công thức */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-container font-label-sm text-label-sm text-on-surface-variant">
                  <span className="truncate font-medium">
                    {title || recipe?.title || 'Sổ tay nấu ăn VeggieLife'}
                  </span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-on-primary">
                    VL
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: HIỂN THỊ LỜI THOẠI ĐỒNG BỘ THEO THỜI GIAN VIDEO */}
            {activeTab === 'transcript' && (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 max-h-[360px] md:max-h-[420px] scroll-smooth"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--color-surface-container-highest) transparent',
                }}
              >
                {segments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant">
                    <Icon name="mic_none" className="text-[32px] text-outline mb-1" />
                    <p className="font-body-sm text-body-sm">Đang tải lời thoại video...</p>
                  </div>
                ) : (
                  segments.map((seg, idx) => {
                    const isActive = idx === activeIndex;
                    const isPassed = currentTime > seg.end;

                    return (
                      <div
                        key={seg.id || idx}
                        ref={isActive ? activeItemRef : null}
                        onClick={() => handleSeek(seg.start)}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'group flex items-start gap-2.5 rounded-xl p-2.5 text-left transition-all duration-200 cursor-pointer border',
                          isActive
                            ? 'bg-primary-fixed/40 border-primary/30 shadow-xs ring-1 ring-primary/20'
                            : isPassed
                              ? 'bg-surface-container-low/40 border-transparent opacity-85 hover:bg-surface-container-low hover:opacity-100'
                              : 'bg-transparent border-transparent opacity-65 hover:opacity-90 hover:bg-surface-container-low'
                        )}
                      >
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium transition-colors',
                              isActive
                                ? 'bg-primary text-on-primary font-semibold shadow-2xs'
                                : 'bg-surface-container text-on-surface-variant group-hover:bg-primary-fixed group-hover:text-on-primary-fixed'
                            )}
                          >
                            {formatTime(seg.start)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'font-body-sm text-body-sm leading-relaxed transition-colors',
                              isActive
                                ? 'font-bold text-on-primary-fixed'
                                : isPassed
                                  ? 'text-on-surface'
                                  : 'text-on-surface-variant'
                            )}
                          >
                            {seg.text}
                          </p>
                        </div>

                        {isActive && (
                          <span className="shrink-0 text-primary animate-pulse mt-0.5" title="Đang đọc đoạn này">
                            <Icon name="graphic_eq" className="text-[16px]" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Footer chân khung tóm tắt */}
            <div className="flex items-center justify-between border-t border-surface-container px-3.5 py-1.5 bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
              <span className="truncate max-w-[220px]" title={subtitleSource || 'CSDL VeggieLife'}>
                {subtitleSource || 'CSDL VeggieLife'}
              </span>
              <span className="font-label-sm text-label-sm font-semibold text-primary">
                {activeTab === 'recipe'
                  ? `${recipe?.ingredients?.length ?? 0} nguyên liệu`
                  : activeIndex !== -1
                    ? `${activeIndex + 1}/${segments.length}`
                    : `${segments.length} đoạn`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

