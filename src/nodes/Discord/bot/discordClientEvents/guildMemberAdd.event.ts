import { Client, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('guildMemberAdd', (member) => {
    try {
      if (member.user.system) return
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key]
        channel.forEach(async (trigger) => {
          if (trigger.type === 'userJoins') {
            addLog(`Triggering workflow for new member: ${member.user.username}`, client, 'info')
            const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              member.user,
              key,
            ).catch((e) => e)
            if (isEnabled && trigger.placeholder) {
              const channel = client.channels.cache.get(key)
              const placeholder = await (channel as TextChannel)
                .send(trigger.placeholder)
                .catch((e: unknown) => addLog(`${e}`, client, 'error'))
              if (placeholder) placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder)
            }
          }
        })
      })
    } catch (e) {
      addLog(`${e}`, client, 'error')
    }
  })
}
