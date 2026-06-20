import React from "react";
import { Button, Input } from "antd";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isStreaming: boolean;
  theme: {
    primary: string;
    secondary: string;
    surface: string;
    text: string;
    accent: string;
    border: string;
  };
}

const MessageInput: React.FC<MessageInputProps> = ({ input, setInput, handleSend, isStreaming, theme }) => {
  return (
    <div className="p-4 border-t transition-colors duration-500" style={{ borderColor: theme.border }}>
      <div className="flex gap-2 items-center">
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message..."
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          //ctrl + enter 换行
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              setInput(input + "\n");
            }
          }}
          disabled={isStreaming}
          className="flex-1 min-h-[80px] p-3 rounded-lg transition-colors duration-500"
          style={{
            borderColor: theme.border,
            background: theme.surfaceGradient,
            color: theme.text,
          }}
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
        <Button
          type="primary"
          style={{
            background: theme.accentGradient,
            borderColor: theme.border,
            color: '#ffffff',
            transition: 'background 0.5s ease',
          }}
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="h-24 px-6 rounded-lg transition-colors font-semibold shadow-md"
        >
          {isStreaming ? "generating..." : "send"}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;