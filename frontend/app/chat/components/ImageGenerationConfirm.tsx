"use client";

import React from "react";
import { Modal } from "antd";

interface ImageGenerationConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Whether a generation request is currently in flight. */
  loading?: boolean;
  referenceCount?: number;
}

/**
 * Confirmation dialog shown before calling the Jimeng API.
 *
 * Design doc §6.4 — explicit confirmation to avoid accidental cost.
 */
const ImageGenerationConfirm: React.FC<ImageGenerationConfirmProps> = ({
  open,
  onConfirm,
  onCancel,
  loading = false,
  referenceCount = 0,
}) => {
  const modeLabel =
    referenceCount >= 2
      ? "多图融合"
      : referenceCount === 1
        ? "图生图"
        : "文生图";

  return (
    <Modal
      title="确认生图"
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={loading ? "生成中..." : "继续生成"}
      cancelText="取消"
      okButtonProps={{ danger: false }}
    >
      <div style={{ lineHeight: 1.8 }}>
        <p>
          检测到你想基于参考图生成图片。
        </p>
        <p>
          将调用即梦生图 API ({modeLabel})，可能产生费用。是否继续？
        </p>
      </div>
    </Modal>
  );
};

export default ImageGenerationConfirm;
