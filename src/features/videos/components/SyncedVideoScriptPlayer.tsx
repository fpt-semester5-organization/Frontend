import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { TranscriptSegment } from '../types/transcript.types';

export interface SyncedVideoScriptPlayerProps {
  videoUrl?: string | null;
  posterUrl?: string | null;
  title?: string;
  segments: TranscriptSegment[];
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

export const SyncedVideoScriptPlayer: React.FC<SyncedVideoScriptPlayerProps> = ({
  videoUrl,
  posterUrl,
  title,
  segments,
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

        {/* ===================== CỘT PHẢI: KHUNG TÓM TẮT VIDEO (Chỉ hiện khi showScript = true) ===================== */}
        {showScript && (
          <div className="flex flex-col bg-surface-container-lowest text-on-surface border-t md:border-t-0 md:border-l border-surface-container md:col-span-5 relative overflow-hidden transition-all duration-300">
            {/* Header tóm tắt video */}
            <div className="flex items-center justify-between border-b border-surface-container px-3.5 py-2.5 bg-surface-container-low/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-2xs shrink-0">
                  <Icon name="auto_awesome" className="text-[16px]" />
                </span>
                <div className="min-w-0">
                  <h4 className="truncate font-label-md text-label-md font-bold text-on-surface">
                    Tóm tắt video
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Nút bật/tắt tự cuộn */}
                <button
                  type="button"
                  onClick={() => setUserAutoScroll(!userAutoScroll)}
                  title={userAutoScroll ? 'Đang tự cuộn theo lời thoại' : 'Đã tắt tự cuộn'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm transition-colors cursor-pointer',
                    userAutoScroll
                      ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                      : 'bg-surface-container text-on-surface-variant'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      userAutoScroll ? 'bg-primary animate-pulse' : 'bg-outline'
                    )}
                  />
                  Đồng bộ
                </button>

                {/* Nút thu gọn nhanh khung tóm tắt */}
                <button
                  type="button"
                  onClick={() => setShowScript(false)}
                  className="rounded-md p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Thu gọn khung tóm tắt (phóng to video)"
                >
                  <Icon name="chevron_right" className="text-[18px]" />
                </button>
              </div>
            </div>

          {/* Danh sách các câu thoại bóc tách (Đồng bộ theo thời gian video) */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 max-h-[320px] md:max-h-[360px] scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-surface-container-highest) transparent',
            }}
          >
            {segments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant">
                <Icon name="mic_none" className="text-[32px] text-outline mb-1" />
                <p className="font-body-sm text-body-sm">Đang tải tóm tắt video...</p>
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
                    {/* Timestamp badge */}
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

                    {/* Nội dung dòng chữ đọc được */}
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

                    {/* Icon sóng âm thanh khi đoạn này đang nói */}
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

          {/* Footer nhỏ của khung script */}
          <div className="flex items-center justify-between border-t border-surface-container px-3.5 py-2 bg-surface-container-low/40 font-label-sm text-label-sm text-on-surface-variant">
            <span className="truncate max-w-[220px]" title={subtitleSource || title || 'Dữ liệu CSDL VeggieLife'}>
              {subtitleSource ? subtitleSource : (title ? title : 'Dữ liệu CSDL VeggieLife')}
            </span>
            <span className="font-mono text-label-sm font-semibold text-primary">
              {activeIndex !== -1 ? `${activeIndex + 1}/${segments.length}` : `${segments.length} đoạn`}
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

