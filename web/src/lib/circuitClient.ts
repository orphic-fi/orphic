// Circuit's reference partner client. Partners copy this file into their apps, so it uses only fetch and
// WebCrypto. Store the permit as you would an access token.
export type Link = {
  id: string;
  url: string;
  status: "waiting" | "approved" | "expired";
  permit: string | null;
  expires_at: string;
};
export type Session = {
  id: string;
  agent: string;
  name: string;
  wallet: string | null;
  status: "running" | "needs_user" | "stopped";
  value_usd: string | null;
  pnl_usd: string | null;
  error: string | null;
  started_at: string;
};
export type Account = {
  permit_expires_at: string;
  wallets: {
    id: string;
    name: string;
    address: string;
    value_usd: string | null;
    holdings: {
      symbol: string;
      network: string;
      kind: string;
      amount: string;
      value_usd: string | null;
    }[];
  }[];
  sessions: Session[];
};
export type Agent = {
  id: string;
  name: string;
  description: string | null;
  official: boolean;
  yours: boolean;
  return_percent: string | null;
  paper: boolean | null;
  people: number;
};
export type Proposal = {
  id: string;
  title: string;
  status: "review" | "processing" | "done" | "declined" | "failed";
  error: string | null;
  session: string | null;
};
export type Message = {
  id: string;
  chat: string | null;
  status: "working" | "done" | "failed";
  text: string | null;
  reply: string | null;
  proposals: Proposal[];
};
export type Chat = { id: string; messages: Message[]; retry_after_ms: number | null };

export class CircuitError extends Error {
  readonly status: number;
  readonly code: string | null;
  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const PRODUCTION = "https://api.circuit.org";
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const base64url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function call<T>(
  api: string,
  path: string,
  init: { permit?: string | null; body?: unknown; key?: string; method?: "DELETE" } = {},
  retried = false,
): Promise<T> {
  const read = init.body === undefined && init.method === undefined;
  const resendable = read || init.key !== undefined;
  const response = await fetch(`${api}/partner/v0.1${path}`, {
    method: init.method ?? (read ? "GET" : "POST"),
    headers: {
      "content-type": "application/json",
      ...(init.permit ? { authorization: `Bearer ${init.permit}` } : {}),
      ...(init.key ? { "idempotency-key": init.key } : {}),
    },
    body: init.body === undefined ? null : JSON.stringify(init.body),
  }).catch((error: unknown) => {
    if (resendable && !retried) return null;
    throw error;
  });
  if (resendable && !retried && (response === null || response.status === 503)) {
    await wait(Math.min(Number(response?.headers.get("retry-after") ?? 1), 30) * 1000);
    return call(api, path, init, true);
  }
  if (response === null) throw new CircuitError(0, `${api} is unreachable`);
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new CircuitError(response.status, body?.error ?? response.statusText, body?.code ?? null);
  return body as T;
}

export async function link(
  app: string,
  api = PRODUCTION,
  returnUrl?: string,
): Promise<{ url: string; permit: Promise<string> }> {
  const keys = (await crypto.subtle.generateKey({ name: "X25519" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const recipient = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  const body = { app, public_key: hex(recipient), return_url: returnUrl ?? null };
  const created = await call<Link>(api, "/links", { body });
  const permit = (async () => {
    for (;;) {
      const link = await call<Link>(api, `/links/${created.id}`);
      if (link.permit) return open(base64url(link.permit), keys.privateKey, recipient);
      if (link.status === "expired") break;
      await wait(2000);
    }
    throw new CircuitError(408, "The link expired before the user approved");
  })();
  return { url: created.url, permit };
}

async function open(
  sealed: Uint8Array,
  privateKey: CryptoKey,
  recipient: Uint8Array,
): Promise<string> {
  const [ephemeral, iv, ciphertext] = [sealed.slice(0, 32), sealed.slice(32, 44), sealed.slice(44)];
  const sender = await crypto.subtle.importKey("raw", ephemeral, { name: "X25519" }, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "X25519", public: sender }, privateKey, 256),
  );
  const label = new TextEncoder().encode("circuit-permit-handoff:v1");
  const material = new Uint8Array([...label, ...shared, ...ephemeral, ...recipient]);
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", material),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext),
  );
}

export function circuit(permit: string | null, api = PRODUCTION) {
  const get = <T>(path: string) => call<T>(api, path, { permit });
  const post = <T>(path: string, body: unknown = {}, key?: string) =>
    call<T>(api, path, { permit, body, ...(key ? { key } : {}) });
  return {
    account: () => get<Account>("/account"),
    agents: async () => (await get<{ agents: Agent[] }>("/agents")).agents,
    start: (
      params: { agent: string; wallet: string | null; amount: string | null },
      key: string = crypto.randomUUID(),
    ) => post<Session>("/sessions", params, key),
    topUp: (session: string, amount: string, key: string = crypto.randomUUID()) =>
      post<Session>(`/sessions/${session}/top_up`, { amount }, key),
    stop: (session: string) => post<Session>(`/sessions/${session}/stop`),
    send: (chat: string | null, text: string, key: string = crypto.randomUUID()) =>
      post<Message>("/messages", { chat, text }, key),
    chat: (id: string) => get<Chat>(`/chats/${id}`),
    async reply(message: Message, deadlineMs = 180_000): Promise<Message> {
      if (message.chat === null) return message;
      for (const started = Date.now(); ;) {
        const chat = await get<Chat>(`/chats/${message.chat}`);
        const found = chat.messages.find((candidate) => candidate.id === message.id);
        if (found && chat.retry_after_ms === null) return found;
        if (Date.now() - started > deadlineMs)
          throw new CircuitError(408, `Ask is still answering message ${message.id}`);
        await wait(chat.retry_after_ms ?? 1000);
      }
    },
    decide: (proposal: string, decision: "approve" | "decline") =>
      post<Proposal>(`/proposals/${proposal}`, { decision }),
    unlink: () => call<Record<string, never>>(api, "/permit", { permit, method: "DELETE" }),
  };
}
