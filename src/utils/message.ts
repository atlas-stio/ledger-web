// src/utils/message.ts

import { ElMessage } from "element-plus";
import type { MessageHandler } from "element-plus";

export type MessageType = "success" | "warning" | "error" | "info";

export type MessageInput = string | { message?: string } | null | undefined;

// Default configuration
export const MESSAGE_CONFIG = {
    duration: 2000,
    showClose: true,
    center: true,
    grouping: true,
    plain: true,
} as const;

// Default duration by type
export const DURATION_BY_TYPE: Record<MessageType, number> = {
    success: 2000,
    warning: 3000,
    error: 4000,
    info: 2500,
};

// Default text by type (used when the caller does not provide one)
export const DEFAULT_TEXT_BY_TYPE: Record<MessageType, string> = {
    success: "success",
    warning: "warning",
    error: "error",
    info: "info",
};

// Per-type override configuration (optional; used to add special behavior for specific types)
export const TYPE_OVERRIDES: Partial<Record<MessageType, Partial<typeof MESSAGE_CONFIG>>> = {
    // Example: show a close button for error messages so users can close them manually
    // error: { showClose: true },
};

// Resolve the final text to display from the input
function resolveMessage(type: MessageType, content: MessageInput): string {
    if (typeof content === "string") {
        return content;
    }
    return content?.message ?? DEFAULT_TEXT_BY_TYPE[type];
}

// Factory function: creates a message method for the specified type
function createMessage(type: MessageType) {
    return (content: MessageInput, duration?: number): MessageHandler => {
        return ElMessage({
            ...MESSAGE_CONFIG,
            ...TYPE_OVERRIDES[type],
            type,
            message: resolveMessage(type, content),
            duration: duration ?? DURATION_BY_TYPE[type] ?? MESSAGE_CONFIG.duration,
        });
    };
}

export const msg = {
    success: createMessage("success"),
    warning: createMessage("warning"),
    error: createMessage("error"),
    info: createMessage("info"),
};

export default msg;

// Basic usage
// import { msg } from "@/utils/message.ts";

// msg.success("保存成功");
// msg.error("网络异常");
// msg.warning("网络缓慢", 5000); // Custom duration
// msg.info({ message: "已同步" });

// Empty strings are not replaced with default text
// msg.info(""); // Display an empty message

// Get the handler and close it manually
// const handler = msg.error("加载失败");
// setTimeout(() => handler.close(), 1000);
