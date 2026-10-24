import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DigitalGardenHero } from './DigitalGardenHero'

vi.mock('./DigitalGardenScene', () => ({
  DigitalGardenScene: () => <div data-testid="digital-garden-scene" aria-hidden="true" />,
}))

describe('DigitalGardenHero', () => {
  it('presents the approved introduction and preserves the original stamp', () => {
    render(<DigitalGardenHero />)

    expect(screen.getByRole('heading', { name: 'I’m Yulia Xu, a UI/UX designer with 3 years of experience.' })).toBeInTheDocument()
    expect(screen.getByText('DESIGN PORTFOLIO · YULIA · 2026')).toBeInTheDocument()
    expect(screen.getByText('into my daily workflow.')).toBeInTheDocument()
    expect(screen.getByText('My work spans B2B and B2C products.')).toBeInTheDocument()
    expect(screen.getByText('Here are 4 selected projects')).toBeInTheDocument()
    expect(screen.getByText('that show how I design.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Yulia portfolio introduction' })).toHaveClass('snap-section')
  })

  it('renders Chinese copy when the language prop changes', () => {
    render(<DigitalGardenHero language="zh" />)

    expect(screen.getByText('一名 UI/UX 设计师，')).toBeInTheDocument()
    expect(screen.getByText('日常设计工作流。')).toBeInTheDocument()
  })

  it('does not render the about section yet', () => {
    render(<DigitalGardenHero />)

    expect(screen.queryByText(/about me/i)).not.toBeInTheDocument()
  })
})
