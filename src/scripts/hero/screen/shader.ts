/**
 * The screen: one full-viewport fragment shader (GLSL 3).
 *
 * A limestone mashrabiya fills the frame. Its eight-point stars and the crosses between them are apertures whose
 * size is a field over the screen:
 *   the OPENING  a shape (a circle — the one world — morphing into an arch) with a half-open rim, which opens and
 *                shuts like an iris about its own centre
 *   the LENS     a small circle that follows the pointer and opens the screen a little wherever you look
 *   uBase        openness everywhere
 * Shut stars stay carved into the face as a V-groove, so the screen reads as a mashrabiya even when closed.
 *
 * The screen has thickness: at an angle you see the inside walls of each aperture. The sun rakes across it from
 * the upper right. Through the apertures, some way behind the screen, is the world: a photograph of a moment held
 * in time, with its own depth map so the eye can lean round it (parallax), and the same sun comes through the
 * lattice and lies on it in stars.
 *
 * Units: "h" = fractions of the viewport height, origin at the centre, y up.
 */
export const SCREEN_VERT = /* glsl */`
  precision highp float;
  in vec3 position;
  out vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const SCREEN_FRAG = /* glsl */`
  precision highp float;
  in vec2 vUv;
  out vec4 fragColor;

  uniform vec2 uRes;
  uniform float uTime;
  uniform float uCell;          // lattice pitch (h)
  uniform float uThick;         // screen thickness (h)
  uniform float uDepth;         // how far behind the screen the world stands (h)
  uniform vec3 uCam;            // eye: xy offset (h), z distance in front of the screen (h)
  uniform vec3 uSun;            // direction TO the sun; z < 0 = the viewer's side
  uniform vec3 uSunCol;
  uniform vec3 uSkyCol;
  uniform vec3 uStone;
  uniform float uScroll;        // the screen slides sideways between worlds (h)

  // the windows: A (the one you are at, which begins as the one-world circle) and B (the next, arriving)
  uniform vec4 uCircle;         // centre xy, radius, -
  uniform vec4 uArch;           // A: centre xy, half width, half height (the round top is part of the height)
  uniform vec2 uArchB;          // B: centre xy (same size as A)
  uniform float uMorph;         // 0 circle … 1 arch (A only)
  uniform float uIris;          // A's scale about its centre (0 shut … 1 open)
  uniform float uRim;           // width of the half-open rim (h)
  uniform float uOpen;          // openness inside A
  uniform float uOpenB;         // openness inside B
  uniform vec3 uLens;           // pointer xy, radius
  uniform float uLensAmt;
  uniform float uBase;

  // the world
  uniform sampler2D tWorld;
  uniform sampler2D tDepthMap;
  uniform vec4 uWorldRect;      // centre xy, size (h)
  uniform vec3 uRoom;           // the dim room beyond the edges of the photograph
  uniform vec2 uLean;           // parallax: how far the eye has moved round the frozen moment
  uniform float uPush;          // a slow push into the moment while time runs
  uniform float uWorldLit;
  uniform sampler2D tWorld2;
  uniform sampler2D tDepthMap2;
  uniform vec4 uWorldRect2;
  uniform vec3 uRoom2;
  uniform float uWorldMix;
  // the title card: the five moments side by side behind the letters of NEXORA
  uniform sampler2D tStrip;     // five panels in a row
  uniform float uStripMix;
  uniform vec4 uStripSeams;     // four seams (x, h units), between N|E, E|X, X|O, O|R
  uniform vec4 uStripBox;       // the word: left, right, bottom, top (h units)

  uniform sampler2D tPlaster;
  uniform sampler2D tPlasterN;
  uniform float uPlasterScale;
  uniform vec3 uPlasterAvg;
  uniform float uExposure;
  uniform float uGrain;
  uniform float uPatches;       // how much of the outer lattice's light falls on the screen

  float boxS(vec2 p, float s) { vec2 d = abs(p) - vec2(s); return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float boxA(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float starS(vec2 p, float s) { const float c = 0.70710678; vec2 q = vec2(c * (p.x - p.y), c * (p.x + p.y)); return min(boxS(p, s), boxS(q, s)); }
  float crossS(vec2 p, float len, float thk) { return min(boxA(p, vec2(len, thk)), boxA(p, vec2(thk, len))); }

  // round-top arch; c = centre of the whole shape, hw = half width, hh = half height
  float archS(vec2 p, vec2 c, float hw, float hh) {
    vec2 q = p - c;
    float spring = hh - hw;
    if (q.y > spring) return length(q - vec2(0.0, spring)) - hw;   // the round head
    // the straight part: its sides and its foot, but not its top (that is the springing, not an edge)
    vec2 d = vec2(abs(q.x) - hw, -hh - q.y);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  float shapeS(vec2 c) {
    vec2 ctr = mix(uCircle.xy, uArch.xy, uMorph);
    float k = max(uIris, 1e-3);
    vec2 q = ctr + (c - ctr) / k;
    float dc = length(q - uCircle.xy) - uCircle.z;
    float da = archS(q, uArch.xy, uArch.z, uArch.w);
    return mix(dc, da, uMorph) * k;
  }
  float shapeB(vec2 c) { return archS(c, uArchB, uArch.z, uArch.w); }

  float openAt(vec2 c) {
    float o = uBase;
    float ds = shapeS(c);
    o = max(o, uOpen * (1.0 - smoothstep(-uRim, 0.0, ds)) * 1.06);
    if (uOpenB > 0.0) o = max(o, uOpenB * (1.0 - smoothstep(-uRim, 0.0, shapeB(c))) * 1.06);
    float dl = length(c - uLens.xy);
    o = max(o, uLensAmt * (1.0 - smoothstep(uLens.z * 0.3, uLens.z, dl)));
    return o;
  }

  // distance (cell units) to the stone round the apertures; negative = open. o = openness of this cell
  float lattice(vec2 p, out float o) {
    vec2 m = vec2(p.x + uScroll, p.y) / uCell;
    vec2 cell = floor(m) + 0.5;
    vec2 q = m - cell;
    // a small dead zone: a star that is nearly shut is shut (no stray pinpricks)
    o = openAt(vec2(cell.x * uCell - uScroll, cell.y * uCell));
    float os = max(o - 0.05, 0.0) * 1.053;
    float d = os < 0.004 ? 1.0 : starS(q, 0.352 * min(os, 1.5));
    vec2 corner = floor(m + 0.5);
    vec2 r = m - corner;
    float oc = max(openAt(vec2(corner.x * uCell - uScroll, corner.y * uCell)) - 0.05, 0.0) * 1.053;
    float k = min(oc, 1.5);
    float dc = oc < 0.004 ? 1.0 : crossS(r, 0.3 * k, 0.075 * k);
    return min(d, dc);
  }

  vec3 plaster(vec2 uv) { return uStone * mix(vec3(1.0), texture(tPlaster, uv).rgb / uPlasterAvg, 0.32); }

  float sunThrough(vec2 p, float depth) {
    float o;
    vec2 sh = uSun.xy / max(-uSun.z, 0.05);
    float a = lattice(p + sh * depth, o);
    float b = lattice(p + sh * (depth + uThick), o);
    float soft = 0.03 + depth / uCell * 0.05;
    return (1.0 - smoothstep(-soft, soft, a)) * (1.0 - smoothstep(-soft, soft, b));
  }

  // a photograph with its depth, seen from an eye moved by uLean: a few fixed-point steps, so near things slide over
  // far things instead of smearing
  vec3 photo(sampler2D img, sampler2D dep, vec4 rect, vec3 room, vec2 p) {
    vec2 uv = (p - rect.xy) / (rect.zw * (1.0 + uPush)) + 0.5;
    vec2 base = uv;
    for (int i = 0; i < 4; i++) {
      float d = texture(dep, uv).r;
      uv = base + uLean * (d - 0.45);
    }
    vec3 c = texture(img, uv).rgb;
    vec2 e = smoothstep(vec2(0.0), vec2(0.035), uv) * smoothstep(vec2(0.0), vec2(0.035), 1.0 - uv);
    if (e.x * e.y >= 0.999) return c;
    // beyond the photograph: the same room, far out of focus and in the screen's shade
    vec2 m = 1.0 - abs(1.0 - mod(uv, 2.0));
    vec3 far = textureLod(img, m, 6.0).rgb * 0.62 + room * 0.25;
    return mix(far, c, e.x * e.y);
  }

  vec3 strips(vec2 p) {
    float x0 = uStripBox.x, x1 = uStripSeams.x; float k = 0.0;
    if (p.x >= uStripSeams.x) { x0 = uStripSeams.x; x1 = uStripSeams.y; k = 1.0; }
    if (p.x >= uStripSeams.y) { x0 = uStripSeams.y; x1 = uStripSeams.z; k = 2.0; }
    if (p.x >= uStripSeams.z) { x0 = uStripSeams.z; x1 = uStripSeams.w; k = 3.0; }
    if (p.x >= uStripSeams.w) { x0 = uStripSeams.w; x1 = uStripBox.y; k = 4.0; }
    float u = (p.x - x0) / max(x1 - x0, 1e-3), v = (p.y - uStripBox.z) / max(uStripBox.w - uStripBox.z, 1e-3);
    float r = ((x1 - x0) / (uStripBox.w - uStripBox.z)) / 0.9;   // panel aspect over photo aspect: cover
    vec2 q = r > 1.0 ? vec2(u, 0.5 + (v - 0.5) / r) : vec2(0.5 + (u - 0.5) * r, v);
    q = clamp(q, 0.002, 0.998);
    return texture(tStrip, vec2((k + q.x) / 5.0, q.y)).rgb;
  }

  vec3 world(vec2 p) {
    // which window is this? (they are never both near the same point)
    bool inB = uOpenB > 0.0 && shapeB(p) < shapeS(p);
    vec3 a = inB ? photo(tWorld2, tDepthMap2, uWorldRect2, uRoom2, p) : photo(tWorld, tDepthMap, uWorldRect, uRoom, p);
    if (uWorldMix > 0.0) a = mix(a, photo(tWorld2, tDepthMap2, uWorldRect2, uRoom2, p), uWorldMix);
    if (uStripMix > 0.0) a = mix(a, strips(p), uStripMix);
    if (uWorldLit <= 0.0) return a;
    float lit = sunThrough(p, uDepth);
    vec3 shade = mix(vec3(1.0), vec3(0.7, 0.72, 0.76), uWorldLit);
    vec3 warm = mix(vec3(1.0), vec3(1.12, 1.05, 0.95), uWorldLit);
    return a * mix(shade, warm, lit);
  }

  vec3 neutral(vec3 c) {
    float x = min(c.r, min(c.g, c.b));
    float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
    c -= off;
    float peak = max(c.r, max(c.g, c.b));
    if (peak < 0.76) return c;
    float d = 0.24;
    float np = 1.0 - d * d / (peak + d - 0.76);
    c *= np / peak;
    float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0);
    return mix(c, np * vec3(1.0), g);
  }
  vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

  void main() {
    vec2 frag = vUv * uRes;
    vec2 p = (frag - 0.5 * uRes) / uRes.y;
    vec3 rd = normalize(vec3(p - uCam.xy, uCam.z));
    vec2 step1 = rd.xy / rd.z;

    float o;
    float dFront = lattice(p, o);
    vec3 col;
    if (dFront < 0.0) {
      float o2;
      vec2 pb = p + step1 * uThick;
      float dBack = lattice(pb, o2);
      if (dBack < 0.0) {
        col = world(p + step1 * (uThick + uDepth));
      } else {
        vec2 e = vec2(0.0015, 0.0);
        float o3;
        vec2 g = vec2(lattice(pb + e.xy, o3) - lattice(pb - e.xy, o3), lattice(pb + e.yx, o3) - lattice(pb - e.yx, o3));
        vec2 n = -normalize(g + 1e-6);
        float lam = clamp(dot(n, normalize(uSun.xy)) * 0.75 + 0.3, 0.0, 1.0);
        col = plaster(pb * uPlasterScale) * (uSkyCol * 0.4 + uSunCol * lam * 0.5) * 0.85;
      }
    } else {
      vec2 tuv = vec2(p.x + uScroll, p.y) * uPlasterScale;
      vec3 alb = plaster(tuv);
      vec3 tn = texture(tPlasterN, tuv).xyz * 2.0 - 1.0;
      vec3 nrm = vec3(tn.xy * 0.35, 0.0);
      if (dFront < 0.07) {
        vec2 e = vec2(0.0012, 0.0);
        float o3;
        vec2 g = vec2(lattice(p + e.xy, o3) - lattice(p - e.xy, o3), lattice(p + e.yx, o3) - lattice(p - e.yx, o3)) / (2.0 * e.x) * uCell;
        nrm.xy -= g * (1.0 - smoothstep(0.0, 0.06, dFront)) * 0.9;
      }
      float groove = 0.0;
      if (o < 0.35) {
        vec2 m = vec2(p.x + uScroll, p.y) / uCell;
        vec2 cq = m - (floor(m) + 0.5);
        vec2 cr = m - floor(m + 0.5);
        float dc = min(starS(cq, 0.352), crossS(cr, 0.3, 0.075));
        groove = (1.0 - smoothstep(0.0, 0.014, abs(dc))) * (1.0 - smoothstep(0.05, 0.35, o)) * 0.55;
        if (groove > 0.0) {
          vec2 ge = vec2(0.002, 0.0);
          vec2 gg = vec2(min(starS(cq + ge.xy, 0.352), crossS(cr + ge.xy, 0.3, 0.075)) - min(starS(cq - ge.xy, 0.352), crossS(cr - ge.xy, 0.3, 0.075)),
                         min(starS(cq + ge.yx, 0.352), crossS(cr + ge.yx, 0.3, 0.075)) - min(starS(cq - ge.yx, 0.352), crossS(cr - ge.yx, 0.3, 0.075))) / (2.0 * ge.x);
          nrm.xy += -sign(dc) * gg * groove * 0.4;
        }
      }
      vec3 N = normalize(vec3(nrm.xy, -1.0));
      float ndl = max(dot(N, normalize(uSun)), 0.0);
      float wash = smoothstep(-1.1, 1.0, p.x * 0.55 + p.y * 0.85);
      // sunlight falls on the screen through another lattice, unseen, higher up: soft stars of light that drift as
      // the sun moves (only while time runs: uTime stops when it stops)
      {
        vec2 lp = (p + vec2(-0.9, -0.6) + vec2(uTime * 0.006, uTime * 0.0025)) / (uCell * 3.1);
        mat2 sk = mat2(1.0, 0.0, -0.32, 1.0);
        lp = sk * lp;
        vec2 lq = lp - floor(lp) - 0.5;
        float ld = starS(lq, 0.3);
        float lpat = 1.0 - smoothstep(-0.09, 0.12, ld);
        float reach = smoothstep(-0.2, 0.9, p.x * 0.5 + p.y * 0.9) * uPatches;
        ndl *= mix(1.0, mix(0.84, 1.18, lpat), reach);
      }
      float ao = mix(0.74, 1.0, smoothstep(0.0, 0.14, dFront)) * (1.0 - groove * 0.05);
      col = alb * (uSkyCol * (0.36 + 0.05 * (1.0 - wash)) * ao + uSunCol * ndl * (0.6 + 0.3 * wash));
    }
    float vig = 1.0 - 0.14 * pow(length(vUv - 0.5) * 1.3, 2.4);
    vec3 outc = toSRGB(clamp(neutral(col * uExposure * vig), 0.0, 1.0));
    float gr = fract(sin(dot(frag + fract(uTime * 0.37) * 91.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    fragColor = vec4(outc + gr * uGrain, 1.0);
  }
`;
