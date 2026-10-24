import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ProjectDetail } from './ProjectDetail'

it('renders all 16 case-study pages in order with their original aspect ratios', () => {
  render(<ProjectDetail />)
  const images = screen.getAllByRole('img')
  const heights = [1080, 3950, 1400, 1650, 3700, 2100, 2430, 5940, 1080, 2600, 1080, 2960, 1080, 2300, 4480, 1080]
  expect(images).toHaveLength(16)
  images.forEach((image, index) => {
    const page = String(index + 1).padStart(2, '0')
    expect(image.getAttribute('src')).toMatch(new RegExp(`/Myweb/project-details/lingji/01-${page}\\.(webp|png)$`))
    expect(image).toHaveAttribute('width', '1920')
    expect(image).toHaveAttribute('height', String(heights[index]))
    expect(image).toHaveAttribute('loading', index === 0 ? 'eager' : 'lazy')
    expect(image).toHaveAccessibleName(`灵机项目详情，第 ${index + 1} 页，共 16 页`)
  })
  expect(images[0]).toHaveAttribute('fetchpriority', 'high')
  expect(screen.getByRole('link', { name: '返回' })).toHaveAttribute('href', '/Myweb/#project-01')
})
