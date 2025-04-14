import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  ColorResolvable,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { addLog, pollingPromptData } from '../helpers'
import state, { IPromptData } from '../state'

interface PromptRequestData {
  webhookId: string
  channelId: string
  executionId: string
  userId?: string
  content: string
  timeout?: number
  persistent?: boolean
  restrictToRoles?: boolean
  restrictToTriggeringUser?: boolean
  mentionRoles?: string[]
  buttons?: {
    button: Array<{
      label: string
      value: string
      style?: number
      emoji?: string
      disabled?: boolean
    }>
    placeholder?: string
  }
  select?: {
    select: Array<{
      label: string
      value: string
      description?: string
      emoji?: string
      default?: boolean
    }>
    placeholder?: string
    minValues?: number
    maxValues?: number
  }
  buttons_row?: number
  select_row?: number
  placeholder?: string
  colorHex?: string
  options?: {
    delay?: number
    rowButtons?: number
    largeButtons?: boolean
    [key: string]: unknown
  }
}

export default function (ipc: typeof Ipc, client: Client): void {
  ipc.server.on('sendPrompt', async (data: PromptRequestData, socket: Socket) => {
    try {
      addLog(`sendPrompt ${data.webhookId}`, client)

      const guild = client.guilds.cache.first()
      if (!guild) {
        ipc.server.emit(socket, 'sendPrompt', { error: 'No guild found' })
        return
      }

      // Get the channel
      const channel = await client.channels.fetch(data.channelId).catch(() => null)
      if (!channel || !channel.isTextBased() || !channel.isSendable() || channel.type === ChannelType.DM) {
        ipc.server.emit(socket, 'sendPrompt', { error: 'No channel found or not a sendable text channel' })
        return
      }

      let messageId: string | null = null
      let restrictToRoles: boolean | undefined
      let restrictToTriggeringUser: boolean | undefined
      let mentionRoles: string[] = []

      // Handle permission restrictions
      if (data.restrictToRoles && Array.isArray(data.mentionRoles) && data.mentionRoles.length) {
        restrictToRoles = true
        mentionRoles = data.mentionRoles
      } else if (data.restrictToTriggeringUser && data.executionId) {
        restrictToTriggeringUser = true
      }

      // Create embed message
      let embed: EmbedBuilder | undefined
      if (data.colorHex) {
        try {
          embed = new EmbedBuilder().setDescription(data.content).setColor(data.colorHex as ColorResolvable)
        } catch {
          addLog(`Invalid color: ${data.colorHex}`, client)
        }
      }

      // Create message options
      const messageOptions: {
        content: string
        components?: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]
        embeds?: EmbedBuilder[]
      } = {
        content: embed ? '' : data.content,
      }

      const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = []

      if (embed) {
        messageOptions.embeds = [embed]
      }

      // Process buttons
      if (data.buttons?.button?.length) {
        const rowsButtons = data.buttons_row ?? 1
        const buttonsPerRow = Math.max(1, Math.min(5, Math.ceil(data.buttons.button.length / rowsButtons)))

        for (let i = 0; i < data.buttons.button.length; i += buttonsPerRow) {
          const row = new ActionRowBuilder<ButtonBuilder>()
          const rowButtons = data.buttons.button.slice(i, i + buttonsPerRow)

          for (const buttonData of rowButtons) {
            const buttonStyle = typeof buttonData.style === 'number' ? buttonData.style : ButtonStyle.Primary

            const button = new ButtonBuilder()
              .setCustomId(buttonData.value)
              .setLabel(buttonData.label)
              .setStyle(buttonStyle)

            if (buttonData.emoji) {
              button.setEmoji(buttonData.emoji)
            }

            if (buttonData.disabled) {
              button.setDisabled(true)
            }

            row.addComponents(button)
          }
          components.push(row)
        }
      }

      // Process select menu
      if (data.select?.select?.length) {
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        const selectMenu = new StringSelectMenuBuilder().setCustomId('select')

        if (data.select.placeholder) {
          selectMenu.setPlaceholder(data.select.placeholder)
        }

        if (data.select.minValues) {
          selectMenu.setMinValues(data.select.minValues)
        }

        if (data.select.maxValues !== undefined) {
          selectMenu.setMaxValues(data.select.maxValues)
        } else if (data.select.select.length > 1) {
          selectMenu.setMaxValues(data.select.select.length)
        }

        // Add options to select menu
        const selectOptions = data.select.select.map((option) => {
          const selectOption = new StringSelectMenuOptionBuilder().setLabel(option.label).setValue(option.value)

          if (option.description) {
            selectOption.setDescription(option.description)
          }

          if (option.emoji) {
            selectOption.setEmoji(option.emoji)
          }

          if (option.default) {
            selectOption.setDefault(true)
          }

          return selectOption
        })

        selectMenu.addOptions(selectOptions)
        row.addComponents(selectMenu)
        components.push(row)
      }

      // Add components to message options
      if (components.length > 0) {
        messageOptions.components = components
      }

      // Check if we need to use the existing execution matching for user ID
      if (restrictToTriggeringUser && data.executionId) {
        const executionMatching = state.executionMatching.get(data.executionId)
        if (executionMatching?.userId) {
          const member = await guild.members.fetch(executionMatching.userId).catch(() => null)

          if (member) {
            messageOptions.content = `<@${executionMatching.userId}> ${messageOptions.content}`
          }
        }
      }

      // Send the message
      const message = await channel.send(messageOptions).catch((e: Error) => {
        addLog(`Error sending message: ${e.message}`, client)
        return null
      })

      if (!message) {
        ipc.server.emit(socket, 'sendPrompt', { error: 'Failed to send message' })
        return
      }

      messageId = message.id

      // Store the prompt data
      if (messageId) {
        const promptData: IPromptData = {
          executionId: data.executionId,
          content: data.content,
          value: null,
          restrictToRoles,
          restrictToTriggeringUser,
          mentionRoles,
        }

        // Add optional properties only if they exist
        if (data.buttons) promptData.buttons = data.buttons
        if (data.select) promptData.select = data.select
        if (data.options) promptData.options = data.options
        if (data.buttons_row) promptData.buttons_row = data.buttons_row
        if (data.select_row) promptData.select_row = data.select_row
        if (data.placeholder) promptData.placeholder = data.placeholder
        if (data.colorHex) promptData.colorHex = data.colorHex

        // Store the data in state using set method
        state.promptDataMap.set(messageId, promptData)

        if (!data.persistent && data.timeout !== 0) {
          const seconds = data.timeout || 60
          const pollResult = await pollingPromptData(message, data.content, seconds, client)

          if (pollResult && state.promptDataMap.has(messageId)) {
            const response = state.promptDataMap.get(messageId)
            // Clean up using Map's delete method
            state.promptDataMap.delete(messageId)
            ipc.server.emit(socket, 'sendPrompt', { response, messageId })
          } else {
            ipc.server.emit(socket, 'sendPrompt', { timeout: true, messageId })
          }
        } else {
          // For persistent prompts, just return confirmation
          ipc.server.emit(socket, 'sendPrompt', { success: true, messageId })
        }
      } else {
        ipc.server.emit(socket, 'sendPrompt', { error: 'Failed to get message ID' })
      }
    } catch (e) {
      addLog(`Error in sendPrompt: ${e instanceof Error ? e.message : String(e)}`, client)
      ipc.server.emit(socket, 'sendPrompt', { error: e instanceof Error ? e.message : String(e) })
    }
  })
}
