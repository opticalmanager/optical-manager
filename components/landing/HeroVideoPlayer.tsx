"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import HeroCardBackdrop from "./HeroCardBackdrop";

export default function HeroVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
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
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      }
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [volume]);

  const handleVideoClick = useCallback(() => {
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
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
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

  const handleRestart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="relative group">
      {/* Stylish Modern Layered SaaS Backdrop with Waves, Doodles, Glow & 3D Shadow */}
      <HeroCardBackdrop />

      {/* Modern 1px Precision Gradient Border Frame */}
      <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-slate-300/80 via-slate-200/60 to-slate-300/40 group-hover:from-blue-500/50 group-hover:via-indigo-400/40 group-hover:to-cyan-400/40 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18),0_2px_4px_rgba(15,23,42,0.06)] transition-all duration-500">
        <div
          ref={containerRef}
          className="relative rounded-[15px] overflow-hidden bg-slate-950 aspect-[16/9]"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Top Specular Glass Reflection Hairline */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent z-20 pointer-events-none" />
          {/* Subtle Inset Ring */}
          <div className="absolute inset-0 rounded-[15px] ring-1 ring-inset ring-white/10 pointer-events-none z-20" />
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

          {/* Simple Professional Audio Toggle Pill */}
          <motion.button
            type="button"
            onClick={toggleMute}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            aria-label={isMuted ? "Unmute video" : "Mute audio"}
            className="absolute top-3.5 right-3.5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/70 hover:bg-slate-900/90 text-white border border-white/15 hover:border-white/25 backdrop-blur-md shadow-lg shadow-black/20 text-xs font-medium transition-all cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-white/90" />
                <span className="tracking-tight text-[11px] font-medium text-white/90">Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-white" />
                <span className="tracking-tight text-[11px] font-medium text-white">Mute</span>
              </>
            )}
          </motion.button>

          {/* Center Play/Pause Overlay Indicator (when paused) */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={togglePlay}
                className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 hover:bg-slate-950/40 cursor-pointer transition-colors"
              >
                <motion.div
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600/95 text-white flex items-center justify-center shadow-2xl shadow-blue-600/60 border border-white/30"
                >
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 ml-1 fill-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls Overlay */}
          <div
            className={`absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-3 pt-8 transition-opacity duration-200 ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Scrubber Bar */}
            <div
              onClick={handleSeek}
              className="relative w-full h-1.5 bg-white/20 hover:h-2 rounded-full cursor-pointer transition-all mb-2.5 overflow-hidden group/bar"
            >
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-75 relative"
                style={{ width: `${progress}%` }}
              >
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Bottom Bar Controls */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-white/10"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-white/10"
                  aria-label="Restart video"
                  title="Replay from start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-white/10 flex items-center gap-1.5 text-white/90"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <span className="font-mono text-[10px] text-slate-300 select-none">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Full HD
                </span>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="hover:text-blue-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-white/10"
                  aria-label="Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Pill Badge - Styled Exactly to Reference Aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -bottom-3.5 -left-2 sm:-bottom-4 sm:-left-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl py-2 px-3 sm:py-2.5 sm:px-4 shadow-[0_14px_35px_-4px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)] border border-slate-200/90 flex items-center gap-2.5 sm:gap-3 pointer-events-auto select-none"
      >
        {/* Soft Emerald Circle with Crisp Checkmark */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100/90 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
        </div>

        {/* Text with Playful Blue Curved Underline Doodle */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="relative inline-block font-extrabold text-xs sm:text-[13px] text-slate-900 tracking-tight">
            <span>Modern.</span>
            <svg
              className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-2 overflow-visible text-blue-600"
              viewBox="0 0 52 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2 5.2C14 1.8 36 1.8 50 4.8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-bold text-xs sm:text-[13px] text-slate-800 tracking-tight">
            Powerful. Easy to Use.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
