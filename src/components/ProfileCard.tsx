import '../styles/contact-font.css'
import { useState } from 'react'
import portrait from '../assets/profile/yulia.jpg'
import '../styles/profile-card.css'

export function ProfileCard() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText('Dec27-Xu')
      setCopyState('copied')
    } catch { setCopyState('failed') }
  }
  return (
    <section className="profile-card" data-reading-card aria-label="About Yulia" lang="zh-CN">
      <img className="profile-card__portrait" src={portrait} alt="Yulia Xu · 徐烨" width="960" height="640" decoding="async" />
      <div className="profile-card__identity">
        <h2><span lang="en">YULIA XU</span><span className="profile-card__chinese-name"> · 徐烨</span></h2>
      </div>
      <dl className="profile-card__contacts">
        <div><dt>微信</dt><dd><button type="button" onClick={copyWechat} aria-label="复制微信号 Dec27-Xu">Dec27-Xu</button></dd></div>
        <div><dt>电话</dt><dd><a href="tel:+8615307302170">+86 15307302170</a></dd></div>
        <div><dt>邮箱</dt><dd><a href="mailto:xy657416708@foxmail.com">xy657416708@foxmail.com</a></dd></div>
      </dl>
      <span className="profile-card__status" role="status">{copyState === 'copied' ? 'Copied' : copyState === 'failed' ? '请长按或选中微信号复制' : ''}</span>
    </section>
  )
}
