import { Client, Message } from 'discord.js'

import { addLog, setCurrentWorkflowId, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    try {
      const content = message.content
      if (!content || message.author.bot) return

      const channelId = message.channelId
      const messageChannel = state.channels[channelId]

      if (messageChannel) {
        await Promise.allSettled(
          messageChannel.map(async (trigger) => {
            if (!trigger.active) return

            let match = false
            const botMention = message.mentions.users.has(state.clientId)

            if (trigger.messageRegex) {
              const reg = new RegExp(trigger.messageRegex, 'gim')
              match = reg.test(content)
            } else if (botMention) {
              match = true
            }

            if (match) {
              // Set workflow context for logging
              const previousWorkflowId = setCurrentWorkflowId(trigger.workflowId || null)
              try {
                addLog(
                  `Triggering workflow for message from ${message.author.username}: "${content.substring(0, 50)}..."`,
                  client,
                  'info',
                )
                const isEnabled = await triggerWorkflow(trigger.webhookId, message, '', state.baseUrl).catch(
                  (e: Error) => {
                    addLog(`Error triggering workflow: ${e.message}`, client, 'error')
                    return false
                  },
                )

                if (!isEnabled && trigger.active) {
                  trigger.active = false
                }
              } finally {
                // Restore previous workflow context
                setCurrentWorkflowId(previousWorkflowId)
              }
            }
          }),
        )
      }
    } catch (e) {
      // Clear any workflow context on error
      setCurrentWorkflowId(null)
      addLog(`Error in messageCreate: ${e instanceof Error ? e.message : String(e)}`, client, 'error')
    }
  })
}
