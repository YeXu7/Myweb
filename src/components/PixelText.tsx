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
/** 字符之间空的格子数（0 = 字母紧挨，靠字模自带边列留白） */
const CHAR_SPACING = 0
/** 逗号/撇号等标点宽度较窄，仍占标准格宽以保持网格对齐 */

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
        for (let gy = 0; gy < GLYPH_H; gy++) {
          const rowStr = glyph[gy] ?? ''
          for (let gx = 0; gx < GLYPH_W; gx++) {
            if (rowStr[gx] === '#') {
              out.push({ x: colCursor + gx, y: rowOffset + gy })
            }
          }
        }
        colCursor += GLYPH_W
        if (idx < chars.length - 1) colCursor += CHAR_SPACING
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
