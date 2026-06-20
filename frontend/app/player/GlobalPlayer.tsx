"use client";

import React from "react";
import { Button } from "antd";
import { PauseOutlined, PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { usePlayer } from "./usePlayer";

const statusText = {
  idle: "未播放",
  loading: "加载中",
  playing: "播放中",
  paused: "已暂停",
  error: "播放出错",
  blocked: "等待点击播放",
};

export default function GlobalPlayer() {
  const { status, currentMedia, error, executeCommand, retryPlay } = usePlayer();

  if (!currentMedia && status === "idle") {
    return null;
  }

  const isPlaying = status === "playing";
  const canResume = status === "paused" || status === "blocked";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">
            {currentMedia?.title || "当前无歌曲"}
          </div>
          <div className="truncate text-xs text-gray-500">
            {currentMedia?.artist || "未知歌手"} · {statusText[status]}
          </div>
          {error && <div className="truncate text-xs text-red-500">{error}</div>}
        </div>
        {status === "blocked" ? (
          <Button icon={<PlayCircleOutlined />} onClick={retryPlay}>
            点击播放
          </Button>
        ) : (
          <Button
            icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
            disabled={!currentMedia && !canResume}
            onClick={() =>
              executeCommand({
                command_id: `ui-${Date.now()}`,
                action: isPlaying ? "pause" : "resume",
              })
            }
          />
        )}
        <Button
          icon={<StopOutlined />}
          disabled={!currentMedia && status === "idle"}
          onClick={() =>
            executeCommand({
              command_id: `ui-${Date.now()}`,
              action: "stop",
            })
          }
        />
      </div>
    </div>
  );
}
