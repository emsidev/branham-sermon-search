import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface AudioState {
  url: string | null;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

interface AudioContextType extends AudioState {
  play: (url: string, title: string) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setRate: (rate: number) => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    url: null,
    title: '',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
  });

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setState(s => ({ ...s, currentTime: audio.currentTime }));
    });
    audio.addEventListener('loadedmetadata', () => {
      setState(s => ({ ...s, duration: audio.duration }));
    });
    audio.addEventListener('ended', () => {
      setState(s => ({ ...s, isPlaying: false }));
    });

    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const play = useCallback((url: string, title: string) => {
    const audio = audioRef.current!;
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.play();
    setState(s => ({ ...s, url, title, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) pause();
    else if (state.url) {
      audioRef.current?.play();
      setState(s => ({ ...s, isPlaying: true }));
    }
  }, [state.isPlaying, state.url, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, []);

  const setRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState(s => ({ ...s, playbackRate: rate }));
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setState({ url: null, title: '', isPlaying: false, currentTime: 0, duration: 0, playbackRate: 1 });
  }, []);

  return (
    <AudioContext.Provider value={{ ...state, play, pause, toggle, seek, setRate, stop }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioProvider');
  return ctx;
}
