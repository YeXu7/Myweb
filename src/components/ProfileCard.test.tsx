import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileCard } from './ProfileCard'
afterEach(() => vi.unstubAllGlobals())
it('provides the real contacts and copies only the WeChat ID on request', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<ProfileCard />)
  expect(screen.getByRole('img', { name: 'Yulia Xu · 徐烨' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '+86 15307302170' })).toHaveAttribute('href', 'tel:+8615307302170')
  expect(screen.getByRole('link', { name: 'xy657416708@foxmail.com' })).toHaveAttribute('href', 'mailto:xy657416708@foxmail.com')
  expect(screen.getByRole('heading', { name: 'YULIA XU · 徐烨' })).toBeInTheDocument()
  expect(screen.queryByText('UI/UX Designer')).not.toBeInTheDocument()
  expect(screen.getAllByRole('term').map(el => el.textContent)).toEqual(['微信', '电话', '邮箱'])
  expect(writeText).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Dec27-Xu/ }))
  expect(await screen.findByText('Copied')).toBeInTheDocument()
  expect(writeText).toHaveBeenCalledWith('Dec27-Xu')
})
it('keeps the ID available when clipboard permission fails', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  render(<ProfileCard />)
  fireEvent.click(screen.getByRole('button', { name: /Dec27-Xu/ }))
  expect(await screen.findByText('请长按或选中微信号复制')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Dec27-Xu/ })).toBeInTheDocument()
})
