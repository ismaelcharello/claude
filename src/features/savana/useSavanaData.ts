"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SavanaEvent } from "@/lib/savana/types";

export type RealtimeState = "conectando" | "ao_vivo" | "reconectando";

/**
 * Subscribes to the Savana realtime channel (proxied by the Studio server at
 * /api/savana/ws) and calls `onEvent` for each event. Reconnects with backoff.
 */
export function useSavanaRealtime(onEvent: (event: SavanaEvent) => void): RealtimeState {
  const [state, setState] = useState<RealtimeState>("conectando");
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry = 0;
    let timer: number | undefined;
    let stopped = false;
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/api/savana/ws`);
      socket.onopen = () => {
        retry = 0;
        setState("ao_vivo");
      };
      socket.onmessage = (message) => {
        try {
          handlerRef.current(JSON.parse(String(message.data)) as SavanaEvent);
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        setState("reconectando");
        retry = Math.min(retry + 1, 6);
        timer = window.setTimeout(connect, 500 * 2 ** retry);
      };
    };
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, []);

  return state;
}

/**
 * Loads data with `load` and reloads it (debounced) whenever a realtime event
 * arrives. Keeps the last good data on screen if a reload fails.
 */
export function useLiveResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  const pending = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    try {
      const next = await loadRef.current();
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, load]);

  const realtime = useSavanaRealtime(
    useCallback(() => {
      window.clearTimeout(pending.current);
      pending.current = window.setTimeout(() => void reload(), 150);
    }, [reload])
  );

  return { data, error, reload, realtime };
}
