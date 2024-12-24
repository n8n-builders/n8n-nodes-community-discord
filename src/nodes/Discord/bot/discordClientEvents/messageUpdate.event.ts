import { Client, Message, PartialMessage } from 'discord.js'

import { addLog } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('messageUpdate', (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
    try {
      if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return

      const triggers = Object.values(state.triggers).filter(
        (trigger) => trigger.type === 'message_update' && trigger.channelIds.includes(newMessage.channel.id),
      )

      for (const trigger of triggers) {
        const executionId = `${newMessage.id}-${Date.now()}`
        state.executionMatching[executionId] = {
          channelId: newMessage.channel.id,
          placeholderId: trigger.placeholder,
        }

        const data = {
          executionId,
          channelId: newMessage.channel.id,
          userId: newMessage.author.id,
          userName: newMessage.author.username,
          userTag: newMessage.author.tag,
          messageId: newMessage.id,
          content: newMessage.content,
        }

        // Emit the event to the IPC server
        client.emit('trigger', data)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
