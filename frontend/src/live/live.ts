import { Client, type StompSubscription } from '@stomp/stompjs';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { WS_URL } from '../config';

/**
 * Un único cliente STOMP para toda la app. Las suscripciones se registran aquí y se
 * rehacen solas al reconectar; además avisan para que la vista recargue lo que se perdió.
 */
type Handler = (body: unknown) => void;
interface Entry {
  topic: string;
  handler: Handler;
  onReconnect?: () => void;
  sub?: StompSubscription;
}

export type LiveStatus = 'idle' | 'connecting' | 'online' | 'offline';

let client: Client | null = null;
let status: LiveStatus = 'idle';
let everConnected = false;
const entries = new Set<Entry>();
const statusListeners = new Set<() => void>();

function setStatus(next: LiveStatus) {
  status = next;
  statusListeners.forEach((l) => l());
}

function attach(entry: Entry) {
  if (!client?.connected) return;
  entry.sub = client.subscribe(entry.topic, (message) => {
    try {
      entry.handler(JSON.parse(message.body));
    } catch {
      /* mensaje inválido: se ignora */
    }
  });
}

function ensureClient() {
  if (client) return;
  client = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      const reconnect = everConnected;
      everConnected = true;
      setStatus('online');
      entries.forEach((entry) => {
        attach(entry);
        if (reconnect) entry.onReconnect?.();
      });
    },
    onWebSocketClose: () => {
      entries.forEach((entry) => (entry.sub = undefined));
      if (status !== 'idle') setStatus(everConnected ? 'offline' : 'connecting');
    },
  });
  setStatus('connecting');
  client.activate();
}

export function subscribe(topic: string, handler: Handler, onReconnect?: () => void) {
  ensureClient();
  const entry: Entry = { topic, handler, onReconnect };
  entries.add(entry);
  attach(entry);
  return () => {
    entry.sub?.unsubscribe();
    entries.delete(entry);
  };
}

export function useLiveStatus(): LiveStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => status,
  );
}

/** Suscripción a un tópico mientras el componente está montado. */
export function useTopic<T>(topic: string | null, handler: (body: T) => void, onReconnect?: () => void) {
  const handlerRef = useRef(handler);
  const reconnectRef = useRef(onReconnect);
  handlerRef.current = handler;
  reconnectRef.current = onReconnect;
  useEffect(() => {
    if (!topic) return;
    return subscribe(
      topic,
      (body) => handlerRef.current(body as T),
      () => reconnectRef.current?.(),
    );
  }, [topic]);
}
