export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform vec2 uPointer;
  uniform vec2 uPointerTarget;
  uniform float uTime;
  uniform float uPointerPower;
  uniform float uVelocity;
  uniform float uReducedMotion;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float smooth01(float value) {
    return value * value * (3.0 - 2.0 * value);
  }

  vec2 coverUv(vec2 uv) {
    float screenAspect = uResolution.x / max(uResolution.y, 1.0);
    float imageAspect = uImageResolution.x / max(uImageResolution.y, 1.0);
    vec2 scale = vec2(1.0);

    if (screenAspect > imageAspect) {
      scale.y = imageAspect / screenAspect;
    } else {
      scale.x = screenAspect / imageAspect;
    }

    return (uv - 0.5) * scale + 0.5;
  }

  float safeZone(vec2 uv) {
    vec2 d = (uv - vec2(0.25, 0.50)) / vec2(0.40, 0.30);
    float ellipse = length(d);
    return mix(0.20, 1.0, smoothstep(0.40, 1.20, ellipse));
  }

  void main() {
    vec2 uv = vUv;
    float motion = 1.0 - uReducedMotion;
    float safe = safeZone(uv);
    // 左约 40% 安静、右约 60% 沉浸：数字效果在左弱、右中，hover 再略增
    float sideWeight = smoothstep(0.30, 0.62, uv.x);

    float slowWave = sin(uv.y * 15.0 + uTime * 0.36) * 0.0074;
    float crossWave = cos(uv.x * 12.0 - uv.y * 6.0 - uTime * 0.27) * 0.0052;
    float driftWave = sin((uv.x + uv.y) * 8.0 + uTime * 0.17) * 0.0044;
    // 右侧视觉区波动更明显、左侧文字区弱一些
    vec2 waterDrift = vec2(slowWave + crossWave, crossWave * 0.72 + driftWave)
      * motion * mix(0.5, 1.0, sideWeight);

    vec2 pointerDelta = uv - uPointer;
    pointerDelta.x *= uResolution.x / max(uResolution.y, 1.0);
    float pointerDistance = length(pointerDelta);
    // 第三层（hover）：范围缩到约 45%，去掉旋涡，只保留柔和凹陷 + 轻微折射
    float field = 1.0 - smoothstep(0.016, 0.108, pointerDistance);
    float halo = 1.0 - smoothstep(0.036, 0.153, pointerDistance);
    float magnetic = field * uPointerPower * safe * motion;
    vec2 direction = normalize(pointerDelta + vec2(0.0001));
    // 向指针轻微下陷（凹陷），不做切向旋转
    vec2 magneticWarp = direction * -0.013 * magnetic;
    // 指针附近的轻微折射（沿用水波，不产生涟漪环）
    magneticWarp += waterDrift * field * 0.6 * motion;

    vec2 targetDelta = uPointerTarget - uPointer;
    magneticWarp += targetDelta * field * 0.03 * safe * motion;

    vec2 warpedUv = uv + waterDrift + magneticWarp;
    vec2 gridUv = uv + magneticWarp;

    // 马赛克膜：再放大约 1.6 倍，更有呼吸感（湿润数字膜，非坐标纸）
    float rowBand = floor(gridUv.y * 11.0);
    float rowSeed = hash21(vec2(rowBand, 8.3));
    float columns = mix(18.0, 24.0, rowSeed);
    vec2 grid = vec2(columns, 11.0);
    vec2 cell = floor(gridUv * grid);
    float cellSeed = hash21(cell + rowBand);
    vec2 mergedCell = cell;

    vec2 cellCenter = (mergedCell + 0.5) / grid;
    float cellScale = mix(0.72, 0.92, hash21(mergedCell + 3.4));
    vec2 mosaicUv = mix(warpedUv, cellCenter + (gridUv - cellCenter) * cellScale, 0.74);
    // 降低马赛克占比，让背景图成为主角，数字膜退为第二层
    float mosaicAmount = mix(0.34, 0.50, hash21(mergedCell + 9.1));
    mosaicAmount += magnetic * 0.12;
    mosaicAmount *= mix(0.42, 1.0, safe);

    vec2 sourceUv = coverUv(warpedUv);
    vec2 mosaicSourceUv = coverUv(mosaicUv);
    vec3 base = texture2D(uTexture, sourceUv).rgb;
    vec3 tile = texture2D(uTexture, mosaicSourceUv).rgb;

    float exposure = mix(0.94, 1.06, hash21(mergedCell + 21.7));
    tile *= exposure;
    tile.b += (cellSeed - 0.5) * 0.06;
    tile.g += (0.5 - cellSeed) * 0.035;

    vec3 color = mix(base, tile, mosaicAmount);

    // 第二层：网格线（与马赛克 cell 对齐，细、低对比，左弱右中、hover 略增）
    vec2 within = fract(gridUv * grid);
    float edgeDistance = min(min(within.x, 1.0 - within.x), min(within.y, 1.0 - within.y));
    float lineWidth = 0.013 + magnetic * 0.02;
    float gridLine = 1.0 - smoothstep(0.0, lineWidth, edgeDistance);
    // 让部分 cell 的线缺失/减弱，打破均匀坐标纸感
    float lineVar = smoothstep(0.18, 0.85, hash21(cell + 2.3));
    float highlight = halo * uPointerPower * motion;
    vec3 lineColor = mix(vec3(0.50, 0.68, 0.62), vec3(0.70, 0.88, 0.80), highlight);
    float lineSide = mix(0.40, 0.85, sideWeight) + highlight * 0.4;
    float lineStrength = mix(0.20, 0.42, highlight) * lineSide;
    color = mix(color, lineColor, gridLine * lineStrength * lineVar * mix(0.5, 1.0, safe));

    // 点缀：湿润玻璃 / 数据遮罩块（贴合单个 cell、约 7%、冷青绿偏白为主少量黑、留出边线不漂浮、左侧基本不出现、不闪烁）
    float maskOn = step(0.93, hash21(cell + 17.3));
    float maskBreath = 0.85 + 0.15 * sin(uTime * 0.25 + hash21(cell + 41.9) * 6.2831);
    float isWhite = step(0.22, hash21(cell + 4.4));
    float maskA = mix(mix(0.07, 0.15, hash21(cell + 8.8)), mix(0.08, 0.2, hash21(cell + 5.5)), isWhite);
    vec3 maskColor = mix(vec3(0.02, 0.10, 0.08), vec3(0.78, 0.97, 0.90), isWhite);
    // 乘 (1 - gridLine) 让遮罩落在 cell 内部、保留四周网格边，不再像漂浮方块
    float maskAlpha = maskA * maskOn * maskBreath * sideWeight * mix(0.16, 1.0, safe) * (1.0 - gridLine * 0.7);
    color = mix(color, maskColor, maskAlpha);

    // 区域扫光：柔和椭圆光斑缓慢游走，照亮其覆盖内的线条（中心亮、边缘渐隐），像光掠过湿润数字膜
    // 任意时刻只出现一块扫光：单个柔和椭圆光斑缓慢游走 + 明灭（速度再 ×1.5）
    float scanT = uTime * 0.081;
    vec2 spot = vec2(0.60 + 0.30 * sin(scanT), 0.50 + 0.32 * cos(scanT * 0.8));
    vec2 sd = uv - spot;
    sd.x *= uResolution.x / max(uResolution.y, 1.0);
    float glow = 1.0 - smoothstep(0.0, 0.18, length(sd));
    float breathe = 0.5 + 0.5 * sin(uTime * 0.81);
    float scanField = clamp(glow * breathe, 0.0, 1.0);
    float scanSide = mix(0.3, 1.0, sideWeight) + halo * uPointerPower * 0.4;
    vec3 scanColor = vec3(0.70, 1.0, 0.90);
    color += scanColor * gridLine * scanField * 0.7 * scanSide * motion; // 照亮线条
    color += scanColor * scanField * 0.02 * scanSide * motion;          // 极淡区域光晕

    float vignette = smoothstep(0.92, 0.18, length((uv - 0.5) * vec2(0.92, 0.72)));
    color *= mix(0.93, 1.04, vignette);

    // 亮度呼吸：右侧更明显、左侧文字区更弱，慢而柔
    color *= 1.0 + (0.03 + 0.05 * sideWeight) * sin(uTime * 0.32) * motion;

    // 左侧只做极轻压暗（避免死黑）；标题背后的更暗交给 CSS 径向暗场，边角/底部保留原背景
    color *= mix(0.91, 1.0, sideWeight);

    // 左下角暗部提亮：把残存的小花 / 水波纹理拉出来（uv.y 接近 0 = 屏幕底部），不影响标题区
    float revealLowerLeft = (1.0 - smoothstep(0.04, 0.46, uv.y)) * (1.0 - smoothstep(0.26, 0.58, uv.x));
    color = mix(color, pow(max(color, 0.0), vec3(0.55)), revealLowerLeft * 0.82);

    float grain = hash21(gl_FragCoord.xy + floor(uTime * 12.0)) - 0.5;
    color += grain * 0.018;

    gl_FragColor = vec4(color, 1.0);
  }
`
