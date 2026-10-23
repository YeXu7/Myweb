import { useRef } from 'react'
import { heroContent, heroContinuation } from '../garden/content'
import { useHeroReading } from '../hooks/useHeroReading'
import '../styles/hero-reading.css'

export function DigitalGardenHero({ language = 'en' }: { language?: 'en' | 'zh' }) {
  const content = heroContent[language]
  const heroRef = useRef<HTMLElement>(null)
  useHeroReading(heroRef)
  return (
    <section ref={heroRef} id="top" className="hero snap-section is-ready garden-intro" aria-label="Yulia portfolio introduction" lang={language}>
      <div className="hero__quiet-zone" aria-hidden="true" />
      <div className="hero__grain" aria-hidden="true" />
      <div className="garden-intro__stage">
        <p className="hero__eyebrow garden-intro__stamp">
          <span>{content.eyebrow}</span>
        </p>
        <div className="garden-intro__window" data-reading-window>
          <div className="garden-intro__track" data-reading-track>
            <h1 id="intro-title" className="garden-intro__paragraph">
              {content.intro.map((line) => (
                <span className="garden-intro__line" data-reading-line key={line}>{line}{' '}</span>
              ))}
            </h1>
            <p className="garden-intro__paragraph">
              {content.practice.map((line) => (
                <span className="garden-intro__line" data-reading-line key={line}>
                  {line}{' '}
                </span>
              ))}
            </p>
            {language === 'en' && heroContinuation.map((paragraph, index) => (
              <p className="garden-intro__paragraph" data-reading-continuation={index === 0 ? '' : undefined} key={paragraph[0]}>
                {paragraph.map(line => (
                  <span className="garden-intro__line" data-reading-line key={line}>{line}{' '}</span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
