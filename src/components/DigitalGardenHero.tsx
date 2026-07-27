import { useEffect, useState, type CSSProperties } from 'react'
import { heroContent } from '../garden/content'

// 标题逐字符入场：每个字符带轻微上下/左右错位 + 低透明 + blur，按顺序柔和回位（信号对齐感）
function SplitLetters({
  text,
  baseDelay,
  step,
}: {
  text: string
  baseDelay: number
  step: number
}) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="hero__letter"
          aria-hidden="true"
          style={
            {
              '--lx': `${((i * 37) % 13) - 6}px`,
              '--ly': `${12 + ((i * 53) % 13)}px`,
              animationDelay: `${baseDelay + i * step}s`,
            } as CSSProperties
          }
        >
          {ch}
        </span>
      ))}
    </>
  )
}

type DigitalGardenHeroProps = {
  language?: 'en' | 'zh'
}

export function DigitalGardenHero({ language = 'en' }: DigitalGardenHeroProps) {
  const content = heroContent[language]
  const [ready, setReady] = useState(false)

  // 不在 mount 时立刻播放：等字体+背景就绪后再延迟约 400ms，给 hero 加 is-ready 才开始入场
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setReady(true)
      return
    }
    let timer = 0
    const begin = () => {
      timer = window.setTimeout(() => setReady(true), 400)
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(begin).catch(begin)
    } else {
      begin()
    }
    return () => window.clearTimeout(timer)
  }, [])

  return (
      <section
        id="top"
        className={`hero snap-section${ready ? ' is-ready' : ''}`}
        aria-label="Yulia portfolio introduction"
      >
        <div className="hero__quiet-zone" aria-hidden="true" />
        <div className="hero__grain" aria-hidden="true" />

        <div className="hero__content">
          <p className="hero__eyebrow">
            <span>{content.eyebrow}</span>
          </p>
          <h1 className="hero__title" aria-label={`${content.greeting} ${content.name}`}>
            <span aria-hidden="true">
              <SplitLetters text={content.greeting} baseDelay={0.2} step={0.07} />
            </span>
            <strong aria-hidden="true">
              <SplitLetters text={content.name} baseDelay={0.62} step={0.07} />
            </strong>
          </h1>
          <div className="hero__identity">
            <p className="hero__role">{content.role}</p>
            <p className="hero__statement">{content.statement}</p>
          </div>
        </div>

        <div className="hero__footer">
          <p className="hero__location">Shenzhen · China</p>
          <p className="scroll-cue" aria-label="Projects section planned for the next screen">
            <span>{content.scroll}</span>
            <span className="scroll-cue__line" aria-hidden="true" />
          </p>
          <p className="hero__index">01 / 03</p>
        </div>
      </section>
  )
}
