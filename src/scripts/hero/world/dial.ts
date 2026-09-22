/**
 * The dial: a floating bronze plate, engraved like an astrolabe, that the five moments hover above. It is the "one
 * world" of the opening line, and the same instrument the Held scene lifts out of the moon later on the page.
 *
 * Its face is drawn once to canvases: the plate (base colour) and the inlay (emissive gold lines, so the engraving
 * catches the lantern even in the dark). A canvas angle equals the ring's own angle (see the note in build()).
 */
import { CircleGeometry, Color, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, TorusGeometry, type Texture } from 'three';
import { canvasTexture, DISPLAY, LABEL, rng } from './kit';

export const DIAL = { r: 6.3, y: 0.34, h: 0.1 };

export function makeDial(opts: { angles: number[]; colors: string[]; names: string[]; env: Texture; px: number }) {
  const S = opts.px;
  const C = S / 2;
  const R = S / 2 - 4;
  // CircleGeometry laid flat (rotation.x = -PI/2) maps world angle phi to canvas angle phi (y down), so every mark
  // below is drawn at the ring's own angles.
  const face = (inlayOnly: boolean) => canvasTexture(S, S, (ctx) => {
    const r = rng(9);
    if (!inlayOnly) {
      const g = ctx.createRadialGradient(C, C, 0, C, C, R);
      g.addColorStop(0, '#2b2118'); g.addColorStop(0.55, '#221a13'); g.addColorStop(1, '#17110c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      // lathe marks: fine concentric brushing
      for (let i = 0; i < 260; i++) {
        const rr = r() * R;
        ctx.strokeStyle = `rgba(${r() > 0.5 ? '255,220,170' : '0,0,0'},${0.02 + r() * 0.035})`;
        ctx.lineWidth = 0.6 + r() * 1.2;
        ctx.beginPath(); ctx.arc(C, C, rr, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
    }
    const gold = inlayOnly ? '#ffffff' : '#c9a066';
    const line = (w: number) => { ctx.strokeStyle = gold; ctx.lineWidth = w * (S / 2048); };
    const ring = (f: number, w: number) => { line(w); ctx.beginPath(); ctx.arc(C, C, R * f, 0, Math.PI * 2); ctx.stroke(); };
    // the limb: rings and ticks
    ring(0.995, 3); ring(0.955, 1.6); ring(0.9, 1.2); ring(0.8, 1.6); ring(0.62, 1.1); ring(0.36, 1.4); ring(0.33, 0.9);
    for (let d = 0; d < 360; d += 2) {
      const a = (d * Math.PI) / 180;
      const long = d % 10 === 0;
      line(long ? 1.8 : 1);
      const r0 = R * (long ? 0.955 : 0.968), r1 = R * 0.995;
      ctx.beginPath(); ctx.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); ctx.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); ctx.stroke();
    }
    // five sectors: dividing lines, each world's colour arc, its numeral and its name on the rim
    opts.angles.forEach((phi, k) => {
      const edge = phi - Math.PI / 5;
      line(1.6);
      ctx.beginPath(); ctx.moveTo(C + Math.cos(edge) * R * 0.36, C + Math.sin(edge) * R * 0.36); ctx.lineTo(C + Math.cos(edge) * R * 0.955, C + Math.sin(edge) * R * 0.955); ctx.stroke();
      ctx.strokeStyle = inlayOnly ? opts.colors[k] : opts.colors[k] + 'aa';
      ctx.lineWidth = 10 * (S / 2048);
      ctx.beginPath(); ctx.arc(C, C, R * 0.85, phi - 0.5, phi + 0.5); ctx.stroke();
      // numeral: read from outside the ring, where the camera stands (tops toward the centre)
      ctx.save();
      ctx.translate(C + Math.cos(phi) * R * 0.71, C + Math.sin(phi) * R * 0.71);
      ctx.rotate(phi - Math.PI / 2);
      ctx.fillStyle = gold; ctx.textAlign = 'center';
      ctx.font = `300 extra-condensed ${Math.round(S * 0.05)}px ${DISPLAY}`;
      ctx.fillText(`0${k + 1}`, 0, S * 0.017);
      ctx.restore();
      // the name, set along the arc, reading left to right for someone outside looking in
      const name = opts.names[k].toUpperCase();
      ctx.font = `500 expanded ${Math.round(S * 0.0135)}px ${LABEL}`;
      ctx.fillStyle = gold;
      const rad = R * 0.918;
      const widths = [...name].map((ch) => ctx.measureText(ch).width + S * 0.0042);
      const total = widths.reduce((a, b) => a + b, 0);
      let ang = phi + total / rad / 2;
      [...name].forEach((ch, i) => {
        const w = widths[i];
        const mid = ang - w / rad / 2;
        ctx.save();
        ctx.translate(C + Math.cos(mid) * rad, C + Math.sin(mid) * rad);
        ctx.rotate(mid - Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(ch, 0, S * 0.005);
        ctx.restore();
        ang -= w / rad;
      });
    });
    // the rosette at the centre: a ten-point star, twice, turned
    for (const [rad, turn, w] of [[0.3, 0, 1.4], [0.22, Math.PI / 10, 1.1]] as const) {
      line(w);
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = turn + (i * 3 * Math.PI * 2) / 10;
        const x = C + Math.cos(a) * R * rad, y = C + Math.sin(a) * R * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ring(0.08, 1.4);
  });

  const group = new Group();
  const plateTex = face(false);
  const inlayTex = face(true);
  const top = new Mesh(new CircleGeometry(DIAL.r, 160), new MeshPhysicalMaterial({
    map: plateTex, emissiveMap: inlayTex, emissive: new Color(0.95, 0.66, 0.36).multiplyScalar(0.55),
    metalness: 0.7, roughness: 0.52, clearcoat: 0.12, clearcoatRoughness: 0.4, envMap: opts.env, envMapIntensity: 0.8,
  }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = DIAL.y + DIAL.h / 2 + 0.001;
  const body = new Mesh(new CylinderGeometry(DIAL.r, DIAL.r * 0.985, DIAL.h, 160, 1, true), new MeshPhysicalMaterial({
    color: new Color('#5a4128'), metalness: 1, roughness: 0.32, envMap: opts.env, envMapIntensity: 1.1,
  }));
  body.position.y = DIAL.y;
  const rim = new Mesh(new TorusGeometry(DIAL.r, 0.028, 10, 220), new MeshPhysicalMaterial({ color: new Color('#d8ae6e'), metalness: 1, roughness: 0.2, envMap: opts.env, envMapIntensity: 1.4 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = DIAL.y + DIAL.h / 2;
  group.add(top, body, rim);
  return { group, top };
}
