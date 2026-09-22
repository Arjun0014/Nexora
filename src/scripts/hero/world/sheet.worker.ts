/** Runs the linen simulation off the main thread, so the intro keeps moving while it is computed. */
import { simulateSheet } from './sheet-sim';

// (No `/// <reference lib="webworker" />` here: it would swap the DOM's event types out for the whole project.)
const scope = self as unknown as { onmessage: (() => void) | null; postMessage(m: unknown, t: Transferable[]): void };
scope.onmessage = () => {
  const sim = simulateSheet();
  scope.postMessage(sim, [sim.data.buffer]);
};
