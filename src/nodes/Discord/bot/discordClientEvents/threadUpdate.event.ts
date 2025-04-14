import { Client } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('threadUpdate', (oldThread, newThread) => {
    try {
      if (Object.keys(state.channels).length > 0) {
        const matchedTriggers = Object.values(state.channels).flatMap((triggers) =>
          triggers.filter((trigger) => trigger.type === 'thread_update' && trigger.channelIds?.includes(newThread.id)),
        )

        matchedTriggers.forEach(async (trigger) => {
          addLog(`triggerWorkflow ${trigger.webhookId}`, client)

          await triggerWorkflow(trigger.webhookId, null, '', state.baseUrl, undefined, newThread.id).catch(
            (e: Error) => {
              addLog(`Error triggering workflow: ${e.message}`, client)
            },
          )
        })
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
