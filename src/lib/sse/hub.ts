import type { SseEvent } from "./events";

/**
 * 进程内 SSE Hub —— technical.md §6 / ADR-006
 *
 * 单容器单进程下，按 userId 维护订阅者集合；mutation 在事务 commit 后
 * 同步调用 `publish(userId, event)`。跨进程 / 水平扩展不在本期范围内。
 *
 * HMR-safe：开发模式下 next/turbopack 会重复加载本模块，用 globalThis
 * 单例避免出现多个互相看不到事件的 Hub 实例。
 */

export type Subscriber = (event: SseEvent) => void;

type HubState = {
  subscribers: Map<string, Set<Subscriber>>;
};

const GLOBAL_KEY = "__klipsyncSseHub" as const;

type GlobalWithHub = typeof globalThis & {
  [GLOBAL_KEY]?: HubState;
};

function getState(): HubState {
  const g = globalThis as GlobalWithHub;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { subscribers: new Map() };
  }
  return g[GLOBAL_KEY];
}

export function subscribe(userId: string, onEvent: Subscriber): () => void {
  const state = getState();
  let set = state.subscribers.get(userId);
  if (!set) {
    set = new Set();
    state.subscribers.set(userId, set);
  }
  set.add(onEvent);
  return () => {
    const cur = state.subscribers.get(userId);
    if (!cur) return;
    cur.delete(onEvent);
    if (cur.size === 0) state.subscribers.delete(userId);
  };
}

export function publish(userId: string, event: SseEvent): void {
  const set = getState().subscribers.get(userId);
  if (!set || set.size === 0) return;
  // 遍历一份快照，避免订阅者在回调中 unsubscribe 导致集合被并发修改
  for (const fn of Array.from(set)) {
    try {
      fn(event);
    } catch (err) {
      console.error("[sse] subscriber threw:", err);
    }
  }
}

/** 便于测试 / 诊断 —— 返回指定用户当前订阅者数量 */
export function subscriberCount(userId: string): number {
  return getState().subscribers.get(userId)?.size ?? 0;
}
