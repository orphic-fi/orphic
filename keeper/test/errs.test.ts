import { describe, expect, it } from "vitest";
import { NOTHING_TO_DO, TOO_SOON, isMissingFunction, isPanic, revertSelector } from "../src/exec/errors.js";
import { callReverted, emptyRevert, panic32, rpcDown } from "./errs.js";

describe("revert classification", () => {
  it("selectors are the 4 bytes of the error signature", () => {
    expect(revertSelector(callReverted("NothingToDo()"))).toBe(NOTHING_TO_DO);
    expect(revertSelector(callReverted("TooSoon()"))).toBe(TOO_SOON);
    expect(NOTHING_TO_DO).not.toBe(TOO_SOON);
    expect(revertSelector(new Error("reverted with NothingToDo()"))).toBeUndefined(); // text proves nothing
  });
  it("a missing function is an empty revert; an RPC failure or a revert with data is not", () => {
    expect(isMissingFunction(emptyRevert())).toBe(true);
    expect(isMissingFunction(rpcDown())).toBe(false);
    expect(isMissingFunction(panic32())).toBe(false);
    expect(isMissingFunction(callReverted("BadSplit()"))).toBe(false);
  });
  it("only Panic(0x32) is the array end", () => {
    expect(isPanic(panic32(), 0x32n)).toBe(true);
    expect(isPanic(panic32(), 0x11n)).toBe(false);
    expect(isPanic(rpcDown(), 0x32n)).toBe(false);
    expect(isPanic(emptyRevert(), 0x32n)).toBe(false);
  });
});
