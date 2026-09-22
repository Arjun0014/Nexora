/**
 * The world's materials. One rule keeps the five moments a family: objects are sculpture (brass, porcelain,
 * lacquer, linen, paper) and the evidence of motion is LIGHT: the pour, the confetti's glints, the sparks, the ink.
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, AdditiveBlending, type Texture } from 'three';

export interface Mats {
  brass: MeshPhysicalMaterial;
  brassDark: MeshPhysicalMaterial;
  porcelain: MeshPhysicalMaterial;
  gold: MeshPhysicalMaterial;
  lacquer: MeshPhysicalMaterial;
  chrome: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  rubber: MeshStandardMaterial;
  copper: MeshStandardMaterial;
  pod: MeshStandardMaterial;
  liquid: (c: Color) => MeshBasicMaterial;
  glow: (c: Color, additive?: boolean) => MeshBasicMaterial;
}

export function makeMaterials(env: Texture): Mats {
  const phys = (o: ConstructorParameters<typeof MeshPhysicalMaterial>[0]) => new MeshPhysicalMaterial({ envMap: env, ...o });
  const std = (o: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial({ envMap: env, ...o });
  return {
    brass: phys({ color: new Color('#caa05c'), metalness: 1, roughness: 0.26, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 1.1 }),
    brassDark: phys({ color: new Color('#8f6a36'), metalness: 1, roughness: 0.38, envMapIntensity: 1.0 }),
    porcelain: phys({ color: new Color('#f6f1e8'), metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.4, side: DoubleSide, emissive: new Color('#2a2420') }),
    gold: phys({ color: new Color('#e2b66e'), metalness: 1, roughness: 0.18, envMapIntensity: 1.3 }),
    lacquer: phys({ color: new Color('#101217'), metalness: 0.2, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 }),
    chrome: std({ color: new Color('#d9dde3'), metalness: 1, roughness: 0.14, envMapIntensity: 1.35 }),
    steel: std({ color: new Color('#8d949d'), metalness: 1, roughness: 0.34, envMapIntensity: 1.1 }),
    rubber: std({ color: new Color('#15171b'), metalness: 0, roughness: 0.55, envMapIntensity: 0.6 }),
    copper: std({ color: new Color('#d27a45'), metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    pod: std({ color: new Color('#8a9660'), metalness: 0, roughness: 0.62, envMapIntensity: 0.5 }),
    // "Liquid light": unlit, HDR, so the bloom carries it. A frozen pour reads as light held in the air.
    liquid: (c) => new MeshBasicMaterial({ color: c, toneMapped: true }),
    glow: (c, additive = true) => new MeshBasicMaterial({ color: c, transparent: additive, blending: additive ? AdditiveBlending : undefined, depthWrite: !additive }),
  };
}
