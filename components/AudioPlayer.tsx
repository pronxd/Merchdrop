'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  title?: string;
}

export default function AudioPlayer({ src, title = "Listen to Kassy" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const initAudioContext = () => {
    if (audioContextRef.current || typeof window === 'undefined') return;

    const audio = audioRef.current;
    if (!audio) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize audio context:', err);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, 'rgba(255, 148, 179, 0.1)');
      gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 148, 179, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Create gradient for each bar
        const barGradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        barGradient.addColorStop(0, '#ff94b3');
        barGradient.addColorStop(0.5, '#d4af37');
        barGradient.addColorStop(1, '#ff94b3');

        ctx.fillStyle = barGradient;

        // Draw bar from center
        const centerY = canvas.height / 2;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const drawStaticWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw static bars
    const barCount = 50;
    const barWidth = canvas.width / barCount;
    const centerY = canvas.height / 2;

    for (let i = 0; i < barCount; i++) {
      // Create a wave pattern
      const progress = currentTime / duration || 0;
      const playedBars = Math.floor(progress * barCount);

      // Static height with slight variation
      const baseHeight = 8 + Math.sin(i * 0.3) * 6 + Math.cos(i * 0.5) * 4;

      if (i <= playedBars) {
        // Played portion - pink/gold
        const gradient = ctx.createLinearGradient(0, centerY - baseHeight, 0, centerY + baseHeight);
        gradient.addColorStop(0, '#ff94b3');
        gradient.addColorStop(0.5, '#d4af37');
        gradient.addColorStop(1, '#ff94b3');
        ctx.fillStyle = gradient;
      } else {
        // Unplayed portion - gray
        ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
      }

      ctx.fillRect(
        i * barWidth + 1,
        centerY - baseHeight,
        barWidth - 2,
        baseHeight * 2
      );
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      drawStaticWaveform();
    }
  }, [isPlaying, currentTime, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      initAudioContext();
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsPlaying(false);
    } else {
      try {
        // Load the audio if not ready
        if (audio.readyState < 2) {
          audio.load();
        }
        await audio.play();
        setDuration(audio.duration || 0);
        setIsLoaded(true);
        drawWaveform();
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to play audio:', err);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl p-6 baroque-shadow">
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 baroque-shadow ${
            isPlaying
              ? 'bg-baroqueGold text-white'
              : 'bg-kassyPink text-white'
          }`}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform and Info */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-playfair text-deepBurgundy font-semibold">{title}</span>
            <span className="font-cormorant text-deepBurgundy/70 text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Waveform Canvas */}
          <canvas
            ref={canvasRef}
            width={500}
            height={50}
            onClick={handleSeek}
            className="w-full h-12 rounded-lg cursor-pointer bg-creamWhite/50"
          />
        </div>
      </div>

      {/* Decorative element */}
      <div className="mt-4 flex justify-center">
        <svg viewBox="0 0 100 10" className="w-24 opacity-50" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 5 Q 25 2, 50 5 T 100 5" stroke="#d4af37" fill="none" strokeWidth="1" />
          <circle cx="50" cy="5" r="2" fill="#d4af37" />
        </svg>
      </div>
    </div>
  );
}
