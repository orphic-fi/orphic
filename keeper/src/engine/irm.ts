/**
 * Approximation of Morpho's Adaptive Curve IRM used to project how our own
 * deposit or withdrawal changes a market's supply rate.
 *
 * The real IRM has two parts: a slow adaptive drift of `rateAtTarget` over
 * time, and an instantaneous curve around the 90% utilization kink. Within
 * a single keeper tick the drift is negligible, so we model only the curve:
 *
 *   err  = (u - 0.9) / (1 - 0.9)   if u > 0.9     (0 .. 1 above the kink)
 *   err  = (u - 0.9) / 0.9         if u <= 0.9    (-1 .. 0 below the kink)
 *   borrowRate(u) = rateAtTarget * (1 + 3 * err)         above the kink
 *   borrowRate(u) = rateAtTarget * (1 + 0.75 * err)      below the kink
 *
 * So the borrow rate is linear in utilization on each side of the kink, equal
 * to rateAtTarget at 90%, a quarter of it at 0% and four times it at 100%.
 * In utilization terms the slope above the kink is much steeper (the rate
 * quadruples over the last 10 points of utilization).
 *
 * We do not know rateAtTarget directly, so we infer it from the observed
 * supply APY and utilization, then evaluate the curve at the post-move
 * utilization. supplyRate = borrowRate * utilization * (1 - fee).
 */

export const KINK = 0.9;
export const CURVE_STEEPNESS = 4;

export function curveMultiplier(u: number): number {
  const util = clamp01(u);
  if (util > KINK) {
    const err = (util - KINK) / (1 - KINK);
    return 1 + (CURVE_STEEPNESS - 1) * err;
  }
  const err = (util - KINK) / KINK;
  return 1 + (1 - 1 / CURVE_STEEPNESS) * err;
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** Borrow rate implied by the observed supply rate at utilization u. */
export function impliedBorrowRate(supplyRate: number, u: number, fee = 0): number {
  const util = clamp01(u);
  if (util <= 0) return 0;
  return supplyRate / (util * (1 - fee));
}

/** rateAtTarget implied by the observed market. */
export function impliedRateAtTarget(supplyRate: number, u: number, fee = 0): number {
  return impliedBorrowRate(supplyRate, u, fee) / curveMultiplier(u);
}

/**
 * Projected supply rate after utilization moves from uNow to uAfter, holding
 * rateAtTarget constant. Returns the observed rate unchanged when uAfter == uNow.
 */
export function projectSupplyRate(supplyRateNow: number, uNow: number, uAfter: number, fee = 0): number {
  const u0 = clamp01(uNow);
  const u1 = clamp01(uAfter);
  if (u0 <= 0 || supplyRateNow <= 0) {
    // No borrow demand: supplying earns nothing regardless of size.
    return 0;
  }
  const rateAtTarget = impliedRateAtTarget(supplyRateNow, u0, fee);
  const borrowAfter = rateAtTarget * curveMultiplier(u1);
  return borrowAfter * u1 * (1 - fee);
}

/** Utilization after adding `delta` of supply (negative delta removes supply). */
export function utilizationAfter(supplyAssets: number, borrowAssets: number, delta: number): number {
  const supplyAfter = supplyAssets + delta;
  if (supplyAfter <= 0) return 1;
  return clamp01(borrowAssets / supplyAfter);
}

/** Convenience: projected supply rate of a market after our delta. */
export function projectMarketRate(
  m: { supplyAssets: number; borrowAssets: number; supplyApy: number; utilization: number; fee: number },
  delta: number,
): number {
  const uAfter = utilizationAfter(m.supplyAssets, m.borrowAssets, delta);
  return projectSupplyRate(m.supplyApy, m.utilization, uAfter, m.fee);
}
