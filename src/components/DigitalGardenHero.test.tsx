import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DigitalGardenHero } from './DigitalGardenHero'

vi.mock('./DigitalGardenScene', () => ({
  DigitalGardenScene: () => <div data-testid="digital-garden-scene" aria-hidden="true" />,
}))

describe('DigitalGardenHero', () => {
  it('presents the introduction with a concise name and year signature', () => {
    render(<DigitalGardenHero />)

    expect(screen.getByRole('heading', { name: 'I’m Yulia Xu, a UI/UX designer with 3 years of experience.' })).toBeInTheDocument()
    expect(screen.getByText('YULIA XU · UI/UX DESIGNER · 2026')).toBeInTheDocument()
    expect(screen.getByText('xy657416708@foxmail.com')).toBeInTheDocument()
    expect(screen.queryByText(/Previously/)).not.toBeInTheDocument()
    expect(screen.getByText('In past projects,').closest('p')).toHaveTextContent('In past projects, I designed B2B and B2C products, integrating AI into my design process.')
    expect(screen.getByText('Dec27-Xu')).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'About Yulia' })
    const statement = screen.getByText('In past projects,')
    const closing = screen.getByText('Here are 4 selected projects')
    expect(statement.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(card.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
