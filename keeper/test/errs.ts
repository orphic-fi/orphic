import { BaseError, ContractFunctionRevertedError, HttpRequestError, toFunctionSelector, type Hex } from "viem";
import { juniorAbi } from "../src/abi/junior.js";

/** What a contract WITHOUT the function does: a revert with no data. */
export const emptyRevert = () => new ContractFunctionRevertedError({ abi: juniorAbi, functionName: "carryOwed" });
/** The array-end revert of a public array getter: Panic(0x32). */
export const panic32 = () =>
  new ContractFunctionRevertedError({ abi: juniorAbi, functionName: "felixExp", data: `0x4e487b71${"32".padStart(64, "0")}` as Hex });
/** A dead or unreachable RPC. */
export const rpcDown = () => new HttpRequestError({ url: "http://127.0.0.1:1" });
/** A failed eth_call carrying real revert data, as viem wraps it (cause chain ends in the raw data). */
export const callReverted = (errorSignature: string) =>
  new BaseError("execution reverted", { cause: Object.assign(new Error("raw"), { data: toFunctionSelector(errorSignature) }) });
