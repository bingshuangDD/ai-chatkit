"use client";

import React from "react";
import { Image, Spin } from "antd";

interface GeneratedImagePanelProps {
  images: Array<{ url: string; size?: string }>;
  prompt?: string;
  loading?: boolean;
}

/**
 * Displays generated images inside an AI message bubble.
 *
 * Design doc §6.4 — generated images are rendered inline with the prompt text.
 */
const GeneratedImagePanel: React.FC<GeneratedImagePanelProps> = ({
  images,
  prompt,
  loading = false,
}) => {
  if (loading) {
    return (
      <div style={{ padding: "12px 0", textAlign: "center" }}>
        <Spin tip="正在调用即梦生成图片..." />
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {prompt && (
        <div
          style={{
            fontSize: 12,
            color: "#666",
            marginBottom: 8,
            wordBreak: "break-word",
          }}
        >
          提示词：{prompt}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {images.map((img, index) => (
          <Image
            key={`gen-${index}-${img.url.slice(-32)}`}
            src={img.url}
            alt={`生成图 ${index + 1}`}
            width={200}
            style={{
              borderRadius: 8,
              border: "1px solid #e8e8e8",
              objectFit: "cover",
            }}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg=="
          />
        ))}
      </div>
    </div>
  );
};

export default GeneratedImagePanel;
