import type { Color, Group, Light, Vector3 } from 'three';
import type { Mats } from '../materials';
import type { WorldId } from '../../../../data/worlds';
import type { SheetSim } from '../sheet-sim';

/**
 * A moment's key light, as data. The world owns ONE follow spot and carries it from moment to moment (one spot
 * instead of five keeps every shader small: faster to compile while the intro is up, and cheaper per frame).
 * Positions are in the moment's own frame.
 */
export interface KeyLight { color: Color; pos: Vector3; target: Vector3; intensity: number; angle: number; penumbra: number }

/**
 * One frozen moment. Built in its own frame: x to the camera's right, y up, z toward the camera.
 * `pose(a)` is a PURE function of the action's progress a ∈ [0, 1] (0.5 is the frozen key frame), so the
 * film can be played at any speed, in either direction, and seeked for QA.
 */
export interface Tableau {
  id: WorldId;
  group: Group;
  key: KeyLight;
  pose(a: number): void;
  /** Time held under the pointer: particles near `p` (world space) drift by `amount` seconds of their own motion. */
  lens?(p: Vector3 | null, amount: number): void;
  /**
   * Lights that belong to the moment but must never be hidden with it (positions in the moment's frame). The world
   * parents them to the ring: the scene's light count must stay constant, or every shader recompiles.
   */
  lights?: Light[];
}

export interface Ctx {
  mats: Mats;
  quality: 'high' | 'medium' | 'low';
  /** the linen's recorded simulation (computed in a worker) */
  sheet?: SheetSim;
}

/** Analytic particles: position is a function of time since spawn, so any a can be shown exactly. */
export interface Particle { p: Vector3; v: Vector3; t0: number; life: number; size: number; spin?: Vector3; rot?: Vector3; hue?: number }
