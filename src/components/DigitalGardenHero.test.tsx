import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DigitalGardenHero } from './DigitalGardenHero'

vi.mock('./DigitalGardenScene', () => ({
  DigitalGardenScene: () => <div data-testid="digital-garden-scene" aria-hidden="true" />,
}))

describe('DigitalGardenHero', () => {
  it('presents Yulia identity and the first-screen controls', () => {
    render(<DigitalGardenHero />)

    expect(screen.getByRole('heading', { name: 'Hi, I’m Yulia Xu' })).toBeInTheDocument()
    expect(screen.getByText('DESIGN PORTFOLIO · YULIA · 2026')).toBeInTheDocument()
    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument()
    expect(screen.getByText(/scroll to explore/i)).toBeInTheDocument()
  })

  it('renders Chinese copy when the language prop changes', () => {
    render(<DigitalGardenHero language="zh" />)

    expect(screen.getByText('UI/UX 设计师')).toBeInTheDocument()
    expect(screen.getByText('向下探索')).toBeInTheDocument()
  })

  it('does not render the about section yet', () => {
    render(<DigitalGardenHero />)

    expect(screen.queryByText(/about me/i)).not.toBeInTheDocument()
  })
})
