"use client";

import { useEffect, useRef } from "react";

import { sseEventSchema, type SseEvent, type SseEventType } from "@/lib/sse/events";
import { useSSEStatus } from "@/lib/store/sse-status";

/**
 * 客户端 SSE 接入 —— technical.md §6 / tasks.md T-304, T-305
 *
 * 设计要点：
 * - 整个应用共享一条 EventSource（模块级单例），避免多个组件订阅就多开一条长连接
 * - 事件分发给本地 listener 池；组件用 `useSSESubscribe(type, handler)` 订阅
 * - 断线重连依赖 EventSource 原生实现；`onerror` 时把 status 切到 'connecting'
 * - 登出 / session.revoked 时由 SSEProvider 调 `closeConnection()` 显式终止
 */

type Listener<E extends SseEvent = SseEvent> = (event: E) => void;

const listeners = new Map<SseEventType, Set<Listener>>();
let eventSource: EventSource | null = null;
let refCount = 0;

function dispatch(raw: unknown): void {
  const parsed = sseEventSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[sse] drop event (schema mismatch):", raw, parsed.error.issues);
    return;
  }
  const event = parsed.data;
  const set = listeners.get(event.type);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try {
      fn(event);
    } catch (err) {
      console.error("[sse] listener threw:", err);
    }
  }
}

function openConnection(): void {
  if (eventSource) return;
  const { setStatus } = useSSEStatus.getState();
  setStatus("connecting");
  const es = new EventSource("/api/stream", { withCredentials: true });
  eventSource = es;

  es.onopen = () => {
    useSSEStatus.getState().setStatus("open");
  };

  es.onerror = () => {
    // EventSource 会自行重连；期间状态回退为 connecting
    useSSEStatus.getState().setStatus("connecting");
  };

  // 用命名事件路由 —— 服务端按 `event: <name>` 发送，每类单独挂 listener
  const types: SseEventType[] = [
    "clipboard.created",
    "clipboard.updated",
    "clipboard.deleted",
    "attachment.added",
    "attachment.removed",
    "session.revoked",
  ];
  for (const type of types) {
    es.addEventListener(type, (ev: MessageEvent<string>) => {
      try {
        const data = JSON.parse(ev.data);
        dispatch(data);
      } catch (err) {
        console.warn("[sse] bad JSON:", ev.data, err);
      }
    });
  }
}

/** 显式关闭连接（登出 / session.revoked） —— 会立刻把 status 切到 'closed' */
export function closeSSEConnection(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  refCount = 0;
  useSSEStatus.getState().setStatus("closed");
}

/**
 * 挂载 SSE 连接（在顶层 Provider 里调用一次）。
 * 返回清理函数，卸载时若没有其他挂载者则关闭连接。
 */
export function useSSEConnection(): void {
  useEffect(() => {
    refCount += 1;
    openConnection();
    return () => {
      refCount -= 1;
      if (refCount <= 0) {
        refCount = 0;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        useSSEStatus.getState().setStatus("closed");
      }
    };
  }, []);
}

/**
 * 订阅某一类 SSE 事件；组件卸载自动取消。
 * handler 通过 ref 保持最新，因此调用方每次渲染传新闭包不会导致重挂订阅。
 */
export function useSSESubscribe<T extends SseEventType>(
  type: T,
  handler: (event: Extract<SseEvent, { type: T }>) => void,
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => {
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    const wrapped: Listener = (event) => {
      (handlerRef.current as Listener)(event);
    };
    set.add(wrapped);
    return () => {
      const cur = listeners.get(type);
      if (!cur) return;
      cur.delete(wrapped);
      if (cur.size === 0) listeners.delete(type);
    };
  }, [type]);
}
