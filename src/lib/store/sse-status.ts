import { create } from "zustand";

/**
 * SSE 连接状态 store —— tasks.md T-304
 *
 * 供 TopBar 状态灯、调试面板等读取；`useSSE` 负责写入。
 */

export type SSEStatus = "connecting" | "open" | "closed";

type SSEStatusStore = {
  status: SSEStatus;
  setStatus: (status: SSEStatus) => void;
};

export const useSSEStatus = create<SSEStatusStore>((set) => ({
  status: "closed",
  setStatus: (status) => set({ status }),
}));
