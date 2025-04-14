import { Client, Message } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    try {
      const content = message.content
      if (!content || message.author.bot) return

      const botMention = message.mentions.has(client.user?.id || '')

      if (state.channels[message.channelId] || state.channels.all) {
        ;[...(state.channels[message.channelId] ?? []), ...(state.channels.all ?? [])].forEach(async (trigger) => {
          if (trigger.type === 'message' && (trigger.pattern?.length || trigger.value?.length || trigger.botMention)) {
            if (trigger.roleIds?.length) {
              const hasRole = trigger.roleIds.some((role) =>
                message.member?.roles.cache.map((r) => r.id).includes(role),
              )
              if (!hasRole) return
            }

            if (trigger.botMention && !botMention) return

            let match = false
            if ((trigger.pattern?.length && trigger.type === 'message') || trigger.value?.length) {
              const regStr = trigger.pattern?.length ? trigger.pattern : `^${trigger.value}$`
              const reg = new RegExp(regStr, trigger.caseSensitive ? '' : 'i')
              match = reg.test(content)
            } else if (botMention) {
              match = true
            }

            if (match) {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client)
              const isEnabled = await triggerWorkflow(trigger.webhookId, message, '', state.baseUrl).catch(
                (e: Error) => {
                  addLog(`Error triggering workflow: ${e.message}`, client)
                  return false
                },
              )

              if (!isEnabled && trigger.active) {
                trigger.active = false
              }
            }
          }
        })
      }
    } catch (e) {
      addLog(`Error in messageCreate: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
