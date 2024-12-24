import { Client, ThreadChannel } from 'discord.js'

import { addLog } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('threadUpdate', (oldThread: ThreadChannel, newThread: ThreadChannel) => {
    try {
      if (!newThread.guild) return

      const triggers = Object.values(state.triggers).filter(
        (trigger) => trigger.type === 'thread_update' && trigger.channelIds.includes(newThread.id),
      )

      for (const trigger of triggers) {
        const executionId = `${newThread.id}-${Date.now()}`
        state.executionMatching[executionId] = {
          channelId: newThread.id,
          placeholderId: trigger.placeholder,
        }

        const data = {
          executionId,
          channelId: newThread.id,
          threadId: newThread.id,
          threadName: newThread.name,
          threadArchived: newThread.archived,
          threadLocked: newThread.locked,
        }

        // Emit the event to the IPC server
        client.emit('trigger', data)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
