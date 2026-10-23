export const paperVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vShade;
  uniform vec2 uSize;
  uniform float uBend;
  uniform float uFlutter;
  uniform float uSeed;
  void main() {
    vUv = uv;
    vec2 p = position.xy;
    float curl = p.x * p.x * 3.0 + p.x * p.y * 1.4;
    float wave = sin(p.x * 5.0 + uSeed) * cos(p.y * 3.0);
    vec3 bent = vec3(p * uSize, uBend * curl + uFlutter * wave);
    bent.y += uBend * (p.x * p.x * 0.16 + p.x * p.y * 0.16);
    bent.y += uBend * (.18 * sin(p.x * 5.3 + uSeed * .2) + .10 * sin(p.x * 10.0 + uSeed) * abs(p.y) * 1.6);
    vShade = 1.0 + p.x * uBend * 0.0008 - p.y * 0.014;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(bent, 1.0);
  }
`

export const paperFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uSize;
  uniform float uOpacity;
  uniform float uBrightness;
  uniform float uRimBrightness;
  uniform float uClarity;
  uniform float uMaskPass;
  uniform float uSeed;
  varying vec2 vUv;
  varying float vShade;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  void main() {
    vec2 p = vUv * uSize;
    // Stable paper-space contours: broad irregularity + small fibres, never time noise.
    float nx = (noise(vec2(p.y * .045, uSeed))-.5) * 1.2 + (noise(vec2(p.y*1.8, 3.0))-.5)*.5;
    float ny = (noise(vec2(p.x * .045, 8.0))-.5) * 1.2 + (noise(vec2(p.x*1.8, 6.0))-.5)*.5;
    float edge = min(min(p.x-2.0-nx, uSize.x-p.x-2.0+nx), min(p.y-2.0-ny, uSize.y-p.y-2.0+ny));
    float aa = max(fwidth(edge), .22);
    float alpha = smoothstep(-aa, aa, edge) * uOpacity;
    if (alpha < .002) discard;
    if (uMaskPass > .5) {
      // All papers contribute: opaque nonselected silhouettes occlude the white mask.
      gl_FragColor = vec4(vec3(uClarity), alpha);
      return;
    }
    vec2 imageUv = clamp((p-vec2(3.0))/(uSize-vec2(6.0)), 0.0, 1.0);
    vec3 color = texture2D(uMap, imageUv).rgb;
    float grain = noise(p * 2.4) - .5;
    float fibre = noise(p * vec2(.32, 5.0)) - .5;
    color *= vShade + grain * .024 + fibre * .012;
    color *= 1.0 + (noise(p * .12)-.5) * .009;
    float rim = 1.0-smoothstep(.45, .85+aa, edge);
    color = mix(color, vec3(.91,.90,.86) * (.97 + grain*.05), rim);
    // Brightness is specified in display space, matching CSS brightness(.30).
    // Keep the untouched path exact, including its original dark-cover gradients.
    float brightness = mix(uBrightness, uRimBrightness, rim);
    if (brightness < .99999) {
      color = sRGBTransferEOTF(vec4(sRGBTransferOETF(vec4(max(color, vec3(0.0)), 1.0)).rgb * brightness, 1.0)).rgb;
    }
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

export const screenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

/** Variable-radius blur acts on the whole paper silhouette, including its fine rim. */
export const focusFragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uClarityMask;
  uniform float uHasClarity;
  uniform vec2 uResolution;
  uniform vec2 uDirection;
  uniform float uDpr;
  uniform float uFinalPass;
  uniform float uFocus;
  varying vec2 vUv;
  void main() {
    float distanceToFocus = abs(vUv.y - .525);
    float softness = smoothstep(.09, .30, distanceToFocus);
    float clarity = uHasClarity > .5 ? texture2D(uClarityMask, vUv).r : 0.0;
    float radius = softness * 9.0 * uDpr * (1.0 - uFocus) * (1.0 - clarity);
    vec2 stepUv = uDirection * radius / (8.0 * uResolution);
    // Input is premultiplied RGBA from the transparent scene target. Blur alpha too.
    // Dense Gaussian taps keep the subpixel white rim continuous at the largest radius.
    vec4 sum;
    if (radius < .01) {
      sum = texture2D(uScene, vUv);
    } else {
      sum = texture2D(uScene, vUv) * .13357122;
      sum += (texture2D(uScene, vUv + stepUv) + texture2D(uScene, vUv - stepUv)) * .12635296;
      sum += (texture2D(uScene, vUv + stepUv * 2.0) + texture2D(uScene, vUv - stepUv * 2.0)) * .10695547;
      sum += (texture2D(uScene, vUv + stepUv * 3.0) + texture2D(uScene, vUv - stepUv * 3.0)) * .08101504;
      sum += (texture2D(uScene, vUv + stepUv * 4.0) + texture2D(uScene, vUv - stepUv * 4.0)) * .05491277;
      sum += (texture2D(uScene, vUv + stepUv * 5.0) + texture2D(uScene, vUv - stepUv * 5.0)) * .03330628;
      sum += (texture2D(uScene, vUv + stepUv * 6.0) + texture2D(uScene, vUv - stepUv * 6.0)) * .01807690;
      sum += (texture2D(uScene, vUv + stepUv * 7.0) + texture2D(uScene, vUv - stepUv * 7.0)) * .00877944;
      sum += (texture2D(uScene, vUv + stepUv * 8.0) + texture2D(uScene, vUv - stepUv * 8.0)) * .00381553;
    }
    gl_FragColor = sum;
    if (uFinalPass > .5 && gl_FragColor.a > .00001) {
      gl_FragColor.rgb /= gl_FragColor.a;
      #include <colorspace_fragment>
      gl_FragColor.rgb *= gl_FragColor.a;
    }
  }
`
