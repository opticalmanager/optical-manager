"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

export default function HeroVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Auto-play on mount with browser compliance
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay was prevented by browser policy
          setIsPlaying(false);
        });
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 10);
  }, []);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.muted) {
      video.muted = false;
      video.volume = 1.0;
      setIsMuted(false);
      // If it was paused, resume playback with sound
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      }
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, []);

  const handleVideoClick = useCallback(() => {
    // If the video is playing but still muted, clicking anywhere on the video un-mutes it first for instant gratification
    if (isMuted && isPlaying) {
      toggleMute();
    } else {
      togglePlay();
    }
  }, [isMuted, isPlaying, toggleMute, togglePlay]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }, []);

  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="relative group">
      {/* Ambient background glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/25 via-indigo-600/20 to-blue-500/25 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Main Container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/15 border border-slate-200/80 bg-white p-2"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="relative rounded-xl overflow-hidden border border-slate-100 bg-slate-950 aspect-[16/9]">
          <video
            ref={videoRef}
            poster="/videos/hero-poster.jpg"
            playsInline
            autoPlay
            loop
            muted
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onPlaying={() => setIsPlaying(true)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={handleVideoClick}
            className="w-full h-full object-cover cursor-pointer block"
          >
            <source src="/videos/hero-intro.mp4" type="video/mp4" />
            <source src="/api/video" type="video/mp4" />
          </video>

          {/* Floating Unmute / Sound Pill in Top-Right */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            className={`absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
              isMuted
                ? "bg-slate-900/85 hover:bg-slate-900 text-white border-white/20 hover:scale-105 ring-2 ring-blue-500/50"
                : "bg-slate-900/60 hover:bg-slate-900/90 text-white/90 border-white/10"
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="tracking-tight">Sound Off • Click to Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="tracking-tight text-slate-200">Sound On</span>
              </>
            )}
          </button>

          {/* Center Play/Pause Indicator (when paused) - Crystal clear without blur */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/25 hover:bg-slate-950/35 cursor-pointer transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-blue-600/95 text-white flex items-center justify-center shadow-2xl shadow-blue-600/50 border border-white/30 hover:scale-110 transition-transform">
                <Play className="w-7 h-7 ml-1 fill-white" />
              </div>
            </div>
          )}

          {/* Bottom Controls Overlay */}
          <div
            className={`absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-3 pt-6 transition-opacity duration-300 ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Scrubber Bar */}
            <div
              onClick={handleSeek}
              className="relative w-full h-1.5 bg-white/20 hover:h-2 rounded-full cursor-pointer transition-all mb-2.5 overflow-hidden"
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Bottom Bar Controls */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-0.5"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-0.5"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>

                <span className="font-mono text-[11px] text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  HD 1080p
                </span>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-0.5"
                  aria-label="Fullscreen"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Badge */}
      <div className="absolute -bottom-4 -left-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-xl px-4 py-2.5 border border-slate-100/90 animate-fade-in animate-delay-600">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-900 tracking-tight">SaaS Operating System</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">for modern optical retail & clinics</p>
      </div>
    </div>
  );
}
