import { Client, ComponentType, GuildMemberRoleManager, Message, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton() && !interaction.isSelectMenu()) return

      const userRoles = (interaction.member?.roles as GuildMemberRoleManager).cache.map((role) => role.id)

      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key]
        channel.forEach(async (trigger) => {
          if (trigger.type === 'interaction' && trigger.interactionMessageId === interaction.message.id) {
            if (trigger.roleIds?.length) {
              const hasRole = trigger.roleIds.some((role: string) => userRoles?.includes(role))
              if (!hasRole) {
                interaction.reply({ content: 'You are not allowed to do this', ephemeral: true })
                return
              }
            }

            addLog(`triggerWorkflow ${trigger.webhookId}`, client)
            const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''
            const interactionValues = interaction.isButton() ? [interaction.customId] : interaction.values
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              interaction.user,
              interaction.channelId,
              undefined,
              undefined,
              undefined,
              undefined,
              interaction.message.id,
              interactionValues,
              userRoles,
            ).catch((e) => e)

            const labels: string[] = []

            interaction.message.components.forEach((component) => {
              component.components.forEach((element) => {
                if (element.type === ComponentType.Button && element.customId === interaction.customId) {
                  if (element.label) labels.push(element.label)
                } else if (element.type === ComponentType.SelectMenu) {
                  element.options.forEach((option) => {
                    // @ts-expect-error legacy declaration
                    if (interaction.values.includes(option.value)) labels.push(option.label)
                  })
                }
              })
            })

            interaction.deferUpdate()

            if (isEnabled && trigger.placeholder) {
              const channel = client.channels.cache.get(key)
              const placeholder = await (channel as TextChannel)
                .send(trigger.placeholder)
                .catch((e: Error) => addLog(e.message, client))
              if (placeholder) placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder)
            }
          }
        })
      })

      const promptData = state.promptData[interaction.message.id]

      // if not part of a dialog interaction
      if (!promptData) {
        return
      }

      // check user right & reply proper message
      if (promptData.restrictToRoles) {
        const hasRole = promptData.mentionRoles.some((role: string) => userRoles?.includes(role))
        if (!hasRole) {
          interaction.reply({ content: 'You are not allowed to do this', ephemeral: true })
          return
        }
      }
      const triggeringUserId = state.executionMatching[promptData.executionId]?.userId
      if (promptData.restrictToTriggeringUser && triggeringUserId && interaction.user.id !== triggeringUserId) {
        interaction.reply({ content: 'You are not allowed to do this', ephemeral: true })
        return
      }

      // no restriction or user authorized
      if (promptData && !promptData.value) {
        const bt = interaction.isButton()
          ? promptData.buttons?.button.find((b: { value: string }) => b.value === interaction.customId)
          : promptData.select?.select.find((b: { value: string }) => b.value === interaction.values[0])
        addLog(`User interact: ${bt.label}`, client)
        promptData.value = interaction.isButton() ? interaction.customId : interaction.values[0]
        promptData.userId = interaction.user.id
        promptData.userName = interaction.user.username
        promptData.userTag = interaction.user.tag
        promptData.channelId = interaction.message.channelId
        promptData.messageId = interaction.message.id
        interaction.update({ components: [] }).catch((e: Error) => e)
        const channel = client.channels.cache.get(interaction.message.channelId)
        ;(channel as TextChannel).send(`<@${interaction.user.id}>: ${bt.label}`)
        setTimeout(async () => {
          const message = await (channel as TextChannel).messages.fetch(interaction.message.id).catch((e: Error) => e)
          if (message instanceof Message) {
            const msg = await (channel as TextChannel).messages.fetch(interaction.message.id).catch((e: Error) => e)
            if (msg instanceof Message) {
              msg.edit({ content: promptData.content, components: [] }).catch((e: Error) => e)
            } else {
              addLog(`Failed to fetch message: ${msg}`, client)
            }
          }
        }, 1000)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
