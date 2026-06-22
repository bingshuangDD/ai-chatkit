import React, { useRef } from "react";
import { Button, Input, message } from "antd";
import { CloseOutlined, PictureOutlined } from "@ant-design/icons";
import { AgentTheme } from "../../config/agentThemeConfig";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isStreaming: boolean;
  theme: AgentTheme;
  images: string[];
  onImagesChange: (images: string[]) => void;
  onGenerateImage?: () => void;
  isGeneratingImage?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const MessageInput: React.FC<MessageInputProps> = ({
  input,
  setInput,
  handleSend,
  isStreaming,
  theme,
  images,
  onImagesChange,
  onGenerateImage,
  isGeneratingImage = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        reject(new Error(`Unsupported image type: ${file.type}`));
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        reject(new Error("Image size cannot exceed 10MB"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const addImages = async (files: FileList | File[]) => {
    const nextImages: string[] = [];
    for (const file of Array.from(files)) {
      try {
        nextImages.push(await fileToDataUrl(file));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to add image";
        message.error(errorMessage);
      }
    }
    if (nextImages.length > 0) {
      onImagesChange([...images, ...nextImages]);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const imageFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (imageFiles.length > 0) {
      event.preventDefault();
      addImages(imageFiles);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
      addImages(event.dataTransfer.files);
    }
  };

  return (
    <div
      className="p-4 border-t transition-colors duration-500"
      style={{ borderColor: theme.border }}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={`${image.slice(0, 32)}-${index}`} className="relative h-20 w-20">
              <img
                src={image}
                alt={`attachment ${index + 1}`}
                className="h-20 w-20 rounded-lg border object-cover"
                style={{ borderColor: theme.border }}
              />
              <button
                type="button"
                aria-label="remove image"
                onClick={() => onImagesChange(images.filter((_, imageIndex) => imageIndex !== index))}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-center">
        <Button
          icon={<PictureOutlined />}
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming || isGeneratingImage}
          className="h-24 w-12 rounded-lg"
          style={{ borderColor: theme.border, color: theme.text }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) {
              addImages(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={images.length > 0 ? "Describe the image..." : "Send a message..."}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            } else if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              setInput(input + "\n");
            }
          }}
          disabled={isStreaming || isGeneratingImage}
          className="flex-1 min-h-[80px] p-3 rounded-lg transition-colors duration-500"
          style={{
            borderColor: theme.border,
            background: theme.surfaceGradient,
            color: theme.text,
          }}
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
        {onGenerateImage && (
          <Button
            type="default"
            style={{
              borderColor: theme.accent,
              color: theme.accent,
              fontWeight: 600,
            }}
            onClick={onGenerateImage}
            disabled={(!input.trim() && images.length === 0) || isStreaming || isGeneratingImage}
            loading={isGeneratingImage}
            className="h-24 px-4 rounded-lg transition-colors"
          >
            参考图生图
          </Button>
        )}
        <Button
          type="primary"
          style={{
            background: theme.accentGradient,
            borderColor: theme.border,
            color: '#ffffff',
            transition: 'background 0.5s ease',
          }}
          onClick={handleSend}
          disabled={(!input.trim() && images.length === 0) || isStreaming || isGeneratingImage}
          className="h-24 px-6 rounded-lg transition-colors font-semibold shadow-md"
        >
          {isStreaming ? "generating..." : "send"}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
