import type { Register } from 'claude-code'

import { clockSolarSvg } from './scene'

const SCENE = 'clock-solar'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const set = await $.theme.set({
      backdrop: { scene: SCENE, glass: { blur: 14, tint: '#0c2444', opacity: 0.42 } },
      overrideColorScheme: 'dark',
    })
    if (!set.isDrawn) $.ui.status(set.reason)
    return next(e)
  })

  // Built on every draw, so the clock hands and the planets start from the real moment.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.scene !== SCENE) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={clockSolarSvg()} alt="Clock, solar system and time-zone globe in real time" isInteractive />
  })
}
