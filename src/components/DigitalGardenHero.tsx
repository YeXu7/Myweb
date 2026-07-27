import { useEffect, useState } from 'react'
import { heroContent } from '../garden/content'
import { PixelText } from './PixelText'

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
            <PixelText
              className="hero__pixel"
              lines={[content.greeting, content.name]}
              cell={9}
              gap={0.1}
              color="#cdf5d8"
              opacity={0.7}
              ariaLabel={`${content.greeting} ${content.name}`}
            />
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
