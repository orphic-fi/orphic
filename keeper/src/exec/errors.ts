import { toFunctionSelector, type Hex } from "viem";

/** Every error in the `cause` chain, outermost first. */
function chain(err: unknown): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let e: unknown = err;
  for (let i = 0; e && typeof e === "object" && i < 10; i++) {
    out.push(e as Record<string, unknown>);
    e = (e as { cause?: unknown }).cause;
  }
  return out;
}

const isHex = (v: unknown): v is Hex => typeof v === "string" && /^0x([0-9a-fA-F]{2})*$/.test(v);

/** The raw revert data of a failed call or read (what viem keeps on `data` or `raw`), or undefined when there is none. */
export function revertData(err: unknown): Hex | undefined {
  for (const e of chain(err)) {
    for (const v of [e.raw, e.data, (e.data as { data?: unknown } | undefined)?.data]) if (isHex(v) && v.length >= 10) return v;
  }
  return undefined;
}

/** The 4-byte selector of the revert data, lower case. */
export function revertSelector(err: unknown): Hex | undefined {
  return revertData(err)?.slice(0, 10).toLowerCase() as Hex | undefined;
}

export const selectorOf = (signature: string): Hex => toFunctionSelector(signature).toLowerCase() as Hex;
export const NOTHING_TO_DO = selectorOf("NothingToDo()");
export const TOO_SOON = selectorOf("TooSoon()");

/** Solidity `Panic(code)`, e.g. 0x32 for an array index out of bounds. */
export function isPanic(err: unknown, code: bigint): boolean {
  // viem keeps a DECODED standard error on `data` ({errorName, args}) and may not keep the raw hex.
  for (const e of chain(err)) {
    const d = e.data as { errorName?: string; args?: unknown[] } | undefined;
    if (d && typeof d === "object" && d.errorName === "Panic" && d.args?.[0] === code) return true;
  }
  const d = revertData(err);
  return !!d && d.slice(0, 10).toLowerCase() === "0x4e487b71" && d.length >= 74 && BigInt(`0x${d.slice(10, 74)}`) === code;
}

const TRANSPORT = new Set(["HttpRequestError", "TimeoutError", "WebSocketRequestError", "RpcRequestError", "InvalidParamsRpcError", "InternalRpcError"]);

/**
 * True when a read failed because the function is not there: the call reverted (or returned nothing) with NO revert
 * data, which is what a contract without that function does. A transport or RPC failure is NOT "missing" (the caller
 * must treat it as unknown), and neither is a revert that carries data.
 */
export function isMissingFunction(err: unknown): boolean {
  if (revertData(err)) return false;
  if (chain(err).some((e) => typeof e.data === "object" && e.data !== null && "errorName" in e.data)) return false; // a decoded revert
  const names = chain(err).map((e) => String(e.name));
  if (names.some((n) => TRANSPORT.has(n))) return false;
  return names.includes("ContractFunctionZeroDataError") || names.includes("ContractFunctionRevertedError");
}
