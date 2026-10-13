import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PastillesFautes } from './PastillesFautes'

const pleines = (container: HTMLElement) =>
  [...container.querySelectorAll('.pastilles-fautes i')].map((cercle) => cercle.classList.contains('pleine'))

describe('PastillesFautes', () => {
  it('dessine 5 cercles dont les n premiers pleins', () => {
    const { container } = render(<PastillesFautes fautes={2} />)
    expect(pleines(container)).toEqual([true, true, false, false, false])
  })

  it('plafonne au total', () => {
    const { container } = render(<PastillesFautes fautes={7} />)
    expect(pleines(container)).toEqual([true, true, true, true, true])
  })

  it('accepte un autre total (coach)', () => {
    const { container } = render(<PastillesFautes fautes={1} total={3} />)
    expect(pleines(container)).toEqual([true, false, false])
  })

  it('est masqué aux lecteurs d’écran', () => {
    const { container } = render(<PastillesFautes fautes={0} />)
    expect(container.querySelector('.pastilles-fautes')).toHaveAttribute('aria-hidden', 'true')
  })
})
