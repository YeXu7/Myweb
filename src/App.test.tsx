import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/DigitalGardenScene', () => ({
  DigitalGardenScene: () => <div data-testid="digital-garden-scene" aria-hidden="true" />,
}))

describe('App portfolio flow', () => {
  it('renders a scroll-snapped home screen followed by an about screen', () => {
    render(<App />)

    expect(screen.getByLabelText('Portfolio snap pages')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /projects/i })).toHaveAttribute('href', '#projects')
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about')
    expect(screen.queryByLabelText('Yulia home')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /switch to chinese/i })).not.toBeInTheDocument()

    // the old marquee archive has been replaced by the About screen
    expect(screen.queryAllByTestId('projects-marquee-group')).toHaveLength(0)
    const about = screen.getByRole('region', { name: 'About' })
    expect(within(about).getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(within(about).getByRole('link', { name: /hello@yulia\.design/i })).toBeInTheDocument()
    expect(within(about).getByText('02 / 03')).toBeInTheDocument()
  })

  it('keeps the existing archive and adds an immersive vine installation project screen', () => {
    render(<App />)

    const installation = screen.getByLabelText('Immersive vine project installation')
    expect(within(installation).queryByRole('heading', { name: 'Living Projects' })).not.toBeInTheDocument()
    expect(within(installation).getByText('WHAT ARE YOU LOOKING FOR?')).toBeInTheDocument()
    expect(within(installation).queryByText(/ask me anything/i)).not.toBeInTheDocument()
    expect(within(installation).queryByRole('button', { name: 'Next project' })).not.toBeInTheDocument()
    expect(within(installation).getByRole('img', { name: 'Wet digital vine installation' })).toBeInTheDocument()
    expect(within(installation).getAllByRole('article')).toHaveLength(4)
    expect(within(installation).getByRole('list', { name: 'Project index' })).toBeInTheDocument()

    // left index is now a set of clickable buttons that drive the helix phase
    const menuItems = within(installation).getAllByRole('button')
    expect(menuItems).toHaveLength(4)
    expect(menuItems[0]).toHaveTextContent('01 / 灵机')
    expect(menuItems[1]).toHaveTextContent('02 / 品牌系统')
    expect(menuItems[2]).toHaveTextContent('03 / 金融 AI')
    expect(menuItems[3]).toHaveTextContent('04 / 即行')

    // the first project starts active in the front position
    expect(menuItems[0]).toHaveAttribute('data-active', 'true')
    const firstCard = within(installation).getByLabelText('01 灵机 installation project card')
    expect(firstCard).toHaveAttribute('data-helix-slot', 'front')

    // all four real project cards are present (continuous helix, not four fixed slots)
    expect(within(installation).getByLabelText('01 灵机 installation project card')).toBeInTheDocument()
    expect(within(installation).getByLabelText('02 品牌系统 installation project card')).toBeInTheDocument()
    expect(within(installation).getByLabelText('03 金融 AI installation project card')).toBeInTheDocument()
    expect(within(installation).getByLabelText('04 即行 installation project card')).toBeInTheDocument()

    // clicking a menu item requests navigation to that project without throwing
    fireEvent.click(menuItems[1])
    expect(menuItems[1]).toBeInTheDocument()
  })
})
