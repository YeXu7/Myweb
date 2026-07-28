import { useMemo } from 'react'

/**
 * PixelText —— 用「手工位图字模」把文字渲染成 LED 点阵屏效果。
 *
 * 为什么不用矢量字降采样：把普通字体在小网格上栅格化，笔画会落在网格边界上，
 * 插值后同一竖笔有时占 1 格、有时占 2 格，粗细不均，i 的点也会糊进竖线。
 * 位图字模由我们逐格定义 0/1，每一笔恒定 1 格宽、i 的点与竖线之间永远空 1 格，
 * 完全就是参考图那种点阵屏质感。
 *
 * 文字本身仍是真实文本（通过 aria-label 暴露给读屏与 SEO）。
 */

/** 5 宽 × 7 高 的点阵字模。每行一个字符串，'#' = 亮，' ' = 灭。 */
const GLYPHS: Record<string, string[]> = {
  A: [
    ' ### ',
    '#   #',
    '#   #',
    '#####',
    '#   #',
    '#   #',
    '#   #',
  ],
  H: [
    '#   #',
    '#   #',
    '#   #',
    '#####',
    '#   #',
    '#   #',
    '#   #',
  ],
  I: [
    '#####',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '#####',
  ],
  X: [
    '#   #',
    '#   #',
    ' # # ',
    '  #  ',
    ' # # ',
    '#   #',
    '#   #',
  ],
  Y: [
    '#   #',
    '#   #',
    ' # # ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
  ],
  a: [
    '     ',
    '     ',
    ' ### ',
    '    #',
    ' ####',
    '#   #',
    ' ####',
  ],
  b: [
    '#    ',
    '#    ',
    '#### ',
    '#   #',
    '#   #',
    '#   #',
    '#### ',
  ],
  i: [
    '  #  ',
    '     ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
  ],
  l: [
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '  #  ',
  ],
  m: [
    '     ',
    '     ',
    '## ##',
    '# # #',
    '# # #',
    '# # #',
    '# # #',
  ],
  o: [
    '     ',
    '     ',
    ' ### ',
    '#   #',
    '#   #',
    '#   #',
    ' ### ',
  ],
  t: [
    '  #  ',
    '  #  ',
    '#####',
    '  #  ',
    '  #  ',
    '  #  ',
    '   ##',
  ],
  u: [
    '     ',
    '     ',
    '#   #',
    '#   #',
    '#   #',
    '#   #',
    ' ####',
  ],
  ',': [
    '     ',
    '     ',
    '     ',
    '     ',
    '  ## ',
    '  ## ',
    ' #   ',
  ],
  "'": [
    '  #  ',
    '  #  ',
    ' #   ',
    '     ',
    '     ',
    '     ',
    '     ',
  ],
  '\u2019': [
    '  #  ',
    '  #  ',
    ' #   ',
    '     ',
    '     ',
    '     ',
    '     ',
  ],
  '.': [
    '     ',
    '     ',
    '     ',
    '     ',
    '     ',
    ' ##  ',
    ' ##  ',
  ],
  ' ': [
    '     ',
    '     ',
    '     ',
    '     ',
    '     ',
    '     ',
    '     ',
  ],
}

const GLYPH_W = 5
const GLYPH_H = 7
/**
 * 比例间距（proportional metrics）。
 *
 * 早期用「固定盒宽」推进（每字都推进 6 列），问题是字母墨迹宽度不同：
 * Y/X/u/m 填满 5 列，而 i/l 只占中间 1 列（左右各空 2 列）。固定推进下，
 * 窄字母相邻时会带上自身的空列，导致 `li`/`ia` 的缝比 `Yu` 宽得多，整句忽松忽紧。
 *
 * 正解是像真实字体那样按「墨迹实际宽度」排版：裁掉每个字模左右的空列，
 * 只保留墨迹本体，字间统一留 GLYPH_GAP 列缝。这样所有字母对的视觉缝都一致
 * （对齐 Yu 基准）。窄字符（i/l/I/'/,）再补 SIDE_BEARING 列边距，避免贴太死。
 */
/** 字母墨迹之间的统一缝隙（列） */
const GLYPH_GAP = 1
/** 空格宽度（列） */
const SPACE_W = 3
/** 窄字符左右各补的边距（列），避免 i/l 这类瘦字贴太紧 */
const SIDE_BEARING: Record<string, number> = {
  i: 0.5,
  l: 0.5,
  I: 0.5,
  "'": 0.5,
  '\u2019': 0.5,
  ',': 0.5,
}

/** 计算字模墨迹的左右边界列 [min,max]；全空返回 null */
function inkBounds(glyph: string[]): [number, number] | null {
  let mn = 99
  let mx = -1
  for (const row of glyph) {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        if (x < mn) mn = x
        if (x > mx) mx = x
      }
    }
  }
  return mx < 0 ? null : [mn, mx]
}

export type PixelTextProps = {
  /** 要渲染的文字（每行一个字符串） */
  lines: string[]
  /** 每个点阵格的像素边长。默认 12 */
  cell?: number
  /** 缝隙占格子的比例 0~0.5。默认 0.1（方块大、缝隙小） */
  gap?: number
  /** 方块颜色。默认 hero 绿 */
  color?: string
  /** 方块透明度 0~1（参考图略降低）。默认 0.7 */
  opacity?: number
  /** 行与行之间的额外空行数（以格计）。默认 2 */
  lineGapCells?: number
  className?: string
  ariaLabel?: string
}

type Cell = { x: number; y: number }

export function PixelText({
  lines,
  cell = 12,
  gap = 0.1,
  color = '#cdf5d8',
  opacity = 0.7,
  lineGapCells = 2,
  className,
  ariaLabel,
}: PixelTextProps) {
  const { cells, cols, rows } = useMemo(() => {
    const out: Cell[] = []
    let maxCols = 0

    lines.forEach((line, li) => {
      const rowOffset = li * (GLYPH_H + lineGapCells)
      let colCursor = 0
      const chars = [...line]
      chars.forEach((ch, idx) => {
        const glyph = GLYPHS[ch] ?? GLYPHS[' ']
        const bounds = inkBounds(glyph)

        // 空格（或全空字模）：推进空格宽度 + 缝，不画任何方块
        if (!bounds) {
          colCursor += SPACE_W
          if (idx < chars.length - 1) colCursor += GLYPH_GAP
          return
        }

        const [mn, mx] = bounds
        const inkW = mx - mn + 1
        const bearing = SIDE_BEARING[ch] ?? 0

        colCursor += bearing // 左边距
        for (let gy = 0; gy < GLYPH_H; gy++) {
          const rowStr = glyph[gy] ?? ''
          for (let gx = mn; gx <= mx; gx++) {
            if (rowStr[gx] === '#') {
              // 把墨迹左移到光标处（裁掉左侧空列）
              out.push({ x: colCursor + (gx - mn), y: rowOffset + gy })
            }
          }
        }
        colCursor += inkW + bearing // 墨迹 + 右边距
        if (idx < chars.length - 1) colCursor += GLYPH_GAP
      })
      maxCols = Math.max(maxCols, colCursor)
    })

    const totalRows = lines.length * GLYPH_H + (lines.length - 1) * lineGapCells
    return { cells: out, cols: maxCols, rows: totalRows }
  }, [lines, lineGapCells])

  const block = cell - cell * gap
  const inset = (cell - block) / 2
  const width = cols * cell
  const height = rows * cell

  return (
    <svg
      className={className}
      role="img"
      aria-label={ariaLabel ?? lines.join(' ')}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      shapeRendering="crispEdges"
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x * cell + inset}
          y={c.y * cell + inset}
          width={block}
          height={block}
          fill={color}
          fillOpacity={opacity}
        />
      ))}
    </svg>
  )
}
