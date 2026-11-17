import type { Register } from 'claude-code'

import { clockSolarSvg } from './scene'

const SCENE = 'clock-solar'
const COMMAND = 'update-clock-solar'
// The marketplace entry this theme is installed from (see README).
const PLUGIN_ID = 'clock-solar-blueprint@clock-solar-blueprint'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const set = await $.theme.set({
      backdrop: { scene: SCENE, glass: { blur: 14, tint: '#0c2444', opacity: 0.42 } },
      overrideColorScheme: 'dark',
    })
    if (!set.isDrawn) $.ui.status(set.reason)
    await $.command.register({
      name: COMMAND,
      description: 'Update the clock-solar-blueprint theme from GitHub',
    })
    return next(e)
  })

  // /update-clock-solar: the same as `claude plugin update`, run from the chat.
  on('command.run', { command: COMMAND }, async $ => {
    try {
      const { exitCode, stdout, stderr } = await $.process.run(['claude', 'plugin', 'update', PLUGIN_ID], { timeoutMs: 120_000 })
      const out = `${stdout}\n${stderr}`.trim()
      return {
        text: exitCode === 0
          ? `${out}\n\nRun /reload-plugins to apply the update.`
          : `Update failed (exit ${exitCode}):\n${out}`,
      }
    } catch (error) {
      return { text: `Could not run \`claude plugin update ${PLUGIN_ID}\`: ${error instanceof Error ? error.message : String(error)}` }
    }
  })

  // Built on every draw, so the clock hands and the planets start from the real moment.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.scene !== SCENE) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={clockSolarSvg()} alt="Clock, solar system and time-zone globe in real time" isInteractive />
  })
}
