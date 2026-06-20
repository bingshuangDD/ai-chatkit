"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { PlayerCommand, PlayerState } from "./types";

interface PlayerContextValue extends PlayerState {
  executeCommand: (command: PlayerCommand) => Promise<void>;
  retryPlay: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    status: "idle",
    currentMedia: null,
    error: null,
  });

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => {
        setState((prev) => ({ ...prev, status: "idle" }));
      });
      audioRef.current.addEventListener("error", () => {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "音频加载失败",
        }));
      });
    }
    return audioRef.current;
  };

  const playAudio = useCallback(async () => {
    const audio = ensureAudio();
    try {
      await audio.play();
      setState((prev) => ({ ...prev, status: "playing", error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "blocked",
        error: "浏览器阻止了自动播放，请点击播放",
      }));
    }
  }, []);

  const executeCommand = useCallback(
    async (command: PlayerCommand) => {
      const audio = ensureAudio();
      switch (command.action) {
        case "play":
          if (!command.media?.source_url) {
            throw new Error("播放命令缺少音频资源");
          }
          setState({
            status: "loading",
            currentMedia: command.media,
            error: null,
          });
          audio.src = command.media.source_url;
          audio.load();
          await playAudio();
          return;
        case "pause":
          audio.pause();
          setState((prev) => ({ ...prev, status: "paused", error: null }));
          return;
        case "resume":
          await playAudio();
          return;
        case "stop":
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          setState({ status: "idle", currentMedia: null, error: null });
          return;
      }
    },
    [playAudio]
  );

  const retryPlay = useCallback(async () => {
    await playAudio();
  }, [playAudio]);

  return (
    <PlayerContext.Provider value={{ ...state, executeCommand, retryPlay }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
};

