/**
 * The world names, standing in the scene behind each moment. Set in the site's display face (condensed light
 * capitals, the ampersand in italic), drawn once to a canvas, then cut into one quad per glyph so the letters can
 * turn in and out one by one in 3D (the site's text vocabulary: chars rotate in on X, staggered).
 */
import {
  CanvasTexture, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, LinearMipmapLinearFilter, Mesh,
  PlaneGeometry, ShaderMaterial, SRGBColorSpace, UniformsLib, UniformsUtils,
} from 'three';
import { DISPLAY } from './kit';

export interface Word { mesh: Mesh; mat: ShaderMaterial; width: number; height: number; set(reveal: number, dir: 1 | -1): void }

export function makeWord(lines: string[], opts: { px: number; color: Color; worldHeight: number }): Word {
  const px = opts.px;
  const lineH = px * 0.94;
  const pad = px * 0.18;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const roman = `300 extra-condensed ${px}px ${DISPLAY}`;
  const italic = `italic 300 condensed ${px * 0.92}px ${DISPLAY}`;
  // measure each glyph (the ampersand is set in italic, as the site sets its one accent)
  type G = { ch: string; x: number; w: number; line: number; it: boolean };
  const glyphs: G[] = [];
  let maxW = 0;
  lines.forEach((ln, li) => {
    let x = 0;
    for (const ch of ln) {
      const it = ch === '&';
      ctx.font = it ? italic : roman;
      const w = ctx.measureText(ch).width;
      if (ch !== ' ') glyphs.push({ ch, x, w, line: li, it });
      x += w + px * 0.012;
    }
    maxW = Math.max(maxW, x);
  });
  c.width = Math.ceil(maxW + pad * 2);
  c.height = Math.ceil(lineH * lines.length + pad * 2);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.textBaseline = 'alphabetic';
  // lines are centred on the widest
  const lineW = lines.map((ln) => { let x = 0; for (const ch of ln) { ctx.font = ch === '&' ? italic : roman; x += ctx.measureText(ch).width + px * 0.012; } return x; });
  for (const g of glyphs) {
    const off = (maxW - lineW[g.line]) / 2;
    g.x += off;
    ctx.font = g.it ? italic : roman;
    ctx.fillStyle = g.it ? '#ffd9a8' : '#ffffff';
    ctx.fillText(g.ch, pad + g.x, pad + lineH * (g.line + 0.8));
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = 8;

  const k = opts.worldHeight / (lineH * lines.length);
  const W = c.width * k, H = c.height * k;
  const n = glyphs.length;
  const base = new PlaneGeometry(1, 1);
  base.translate(0, 0.5, 0); // pivot on the baseline side, so glyphs hinge like the site's chars
  const geo = new InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const offs = new Float32Array(n * 2), size = new Float32Array(n * 2), uvr = new Float32Array(n * 4), idx = new Float32Array(n);
  glyphs.forEach((g, i) => {
    const x0 = pad + g.x - px * 0.06, x1 = pad + g.x + g.w + px * 0.06;
    const y0 = pad + lineH * g.line, y1 = pad + lineH * (g.line + 1) + px * 0.06;
    // quad in world units, centred on the word
    offs[i * 2] = ((x0 + x1) / 2) * k - W / 2;
    offs[i * 2 + 1] = H / 2 - y1 * k;
    size[i * 2] = (x1 - x0) * k; size[i * 2 + 1] = (y1 - y0) * k;
    uvr.set([x0 / c.width, 1 - y1 / c.height, x1 / c.width, 1 - y0 / c.height], i * 4);
    idx[i] = i;
  });
  geo.setAttribute('iOff', new InstancedBufferAttribute(offs, 2));
  geo.setAttribute('iSize', new InstancedBufferAttribute(size, 2));
  geo.setAttribute('iUv', new InstancedBufferAttribute(uvr, 4));
  geo.setAttribute('iIdx', new InstancedBufferAttribute(idx, 1));
  geo.instanceCount = n;

  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide, fog: true,
    uniforms: UniformsUtils.merge([UniformsLib.fog, {
      uMap: { value: tex }, uColor: { value: opts.color }, uReveal: { value: 0 }, uDir: { value: 1 }, uCount: { value: n }, uBias: { value: 0.6 },
    }]),
    vertexShader: /* glsl */`
      attribute vec2 iOff; attribute vec2 iSize; attribute vec4 iUv; attribute float iIdx;
      uniform float uReveal; uniform float uDir; uniform float uCount;
      varying vec2 vUv; varying float vA;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        float st = 0.07;
        float r = clamp((uReveal * (1.0 + st * (uCount - 1.0)) - st * (uDir > 0.0 ? iIdx : (uCount - 1.0 - iIdx))), 0.0, 1.0);
        r = 1.0 - pow(1.0 - r, 3.0);
        float ang = (1.0 - r) * 1.5708 * uDir;
        vec3 p = vec3(position.x * iSize.x, position.y * iSize.y, 0.0);
        // hinge about the glyph's foot, falling back into the scene
        float cy = cos(ang), sy = sin(ang);
        p = vec3(p.x, p.y * cy, -p.y * sy);
        p.xy += iOff;
        p.y -= (1.0 - r) * iSize.y * 0.18;
        vUv = mix(iUv.xy, iUv.zw, uv);
        vA = r;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uColor; uniform float uBias;
      varying vec2 vUv; varying float vA;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec4 t = texture2D(uMap, vUv, uBias);
        float a = t.a * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * t.rgb, a);
        #include <fog_fragment>
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return {
    mesh, mat, width: W, height: H,
    set(reveal: number, dir: 1 | -1) {
      mat.uniforms.uReveal.value = reveal;
      mat.uniforms.uDir.value = dir;
      mesh.visible = reveal > 0.001;
    },
  };
}
