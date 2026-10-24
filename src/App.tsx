import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DigitalGardenHero } from './components/DigitalGardenHero'
import { DigitalGardenScene } from './components/DigitalGardenScene'
import { GlobalNav } from './components/GlobalNav'
import { PaperProjectGallery } from './components/PaperProjectGallery'
import { readingJourney } from './garden/readingJourney'

export default function App() {
  const shellRef = useRef<HTMLElement>(null)
  const [activeSection, setActiveSection] = useState<'home' | 'about' | 'projects'>('home')

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let frame = 0
    let projectStart = 0
    const projects = shell.querySelector<HTMLElement>('#projects')
    let currentSection: 'home' | 'about' | 'projects' = 'home'
    const syncScrollState = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const pageHeight = Math.max(window.innerHeight, 1)
        const progress = Math.min(Math.max(shell.scrollTop / pageHeight, 0), 2)
        const first = String(Math.min(progress, 1))
        if (shell.style.getPropertyValue('--page-progress') !== String(progress)) shell.style.setProperty('--page-progress', String(progress))
        if (shell.style.getPropertyValue('--first-screen-progress') !== first) shell.style.setProperty('--first-screen-progress', first)
        const nextSection = shell.scrollTop > projectStart - pageHeight * readingJourney.navigationLeadScreens ? 'projects' : progress > .55 ? 'about' : 'home'
        if (nextSection !== currentSection) { currentSection = nextSection; setActiveSection(nextSection) }
      })
    }

    const measure = () => {
      projectStart = projects ? projects.getBoundingClientRect().top - shell.getBoundingClientRect().top + shell.scrollTop : Math.max(shell.clientHeight || window.innerHeight, 1) * readingJourney.totalScreens
      syncScrollState()
    }
    measure()
    // The fragment target is created by React, after the initial HTML is parsed.
    if (window.location.hash === '#projects') shell.scrollTop = projectStart
    shell.addEventListener('scroll', syncScrollState, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      window.cancelAnimationFrame(frame)
      shell.removeEventListener('scroll', syncScrollState)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <main
      ref={shellRef}
      className="site-shell reading-shell"
      aria-label="Portfolio snap pages"
      style={{ '--reading-continuation-height': `${readingJourney.continuationScreens * 100}svh` } as CSSProperties}
    >
      <div className="shared-garden" aria-hidden="true">
        <div className="reading-garden-plane">
          <DigitalGardenScene />
        </div>
      </div>
      <GlobalNav activeSection={activeSection} />
      <DigitalGardenHero />
      <section id="about" className="snap-section reading-continuation" aria-label="Selected projects introduction" />
      <PaperProjectGallery />
    </main>
  )
}
