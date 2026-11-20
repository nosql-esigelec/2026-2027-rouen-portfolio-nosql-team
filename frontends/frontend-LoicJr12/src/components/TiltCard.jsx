import { useRef } from 'react'

// Carte qui s'incline en 3D en suivant la souris
export default function TiltCard({ as: Tag = 'div', className = '', children, max = 8, ...rest }) {
  const ref = useRef()

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--ry', `${x * max}deg`)
    ref.current.style.setProperty('--rx', `${-y * max}deg`)
    ref.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    ref.current.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }
  const onLeave = () => {
    ref.current.style.setProperty('--ry', '0deg')
    ref.current.style.setProperty('--rx', '0deg')
  }

  return (
    <Tag ref={ref} className={`tilt ${className}`} onMouseMove={onMove} onMouseLeave={onLeave} {...rest}>
      {children}
    </Tag>
  )
}
