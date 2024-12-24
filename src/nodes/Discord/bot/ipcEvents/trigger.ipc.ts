import {
  Client,
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandNumberOption,
  SlashCommandStringOption,
} from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { registerCommands } from '../commands'
import { addLog } from '../helpers'
import state from '../state'

interface ITriggerParameters {
  webhookId: string
  roleIds: string[]
  roleUpdateIds: string[]
  type: string
  channelIds?: string[]
  pattern?: string
  value?: string
  name?: string
  description?: string
  commandFieldDescription?: string
  commandFieldRequired?: boolean
  commandFieldType?: string
  placeholder?: string
  interactionMessageId?: string
  active?: boolean
}

export default function (ipc: typeof Ipc, client: Client) {
  let timeout: NodeJS.Timeout | null = null

  ipc.server.on(
    'trigger',
    (
      data: {
        webhookId: string
        baseUrl: string
        credentials: { token: string; clientId: string }
        [key: string]: any
      },
      socket: Socket,
    ) => {
      try {
        addLog(`trigger ${data.webhookId} update`, client)
        state.triggers[data.webhookId] = {
          ...data,
          channelIds: data.channelIds || [],
          roleIds: data.roleIds || [],
          roleUpdateIds: data.roleUpdateIds || [],
          type: data.type || '',
          active: data.active || false,
        }
        state.channels = {}
        state.baseUrl = data.baseUrl
        const commandsParam: ITriggerParameters[] = []

        Object.keys(state.triggers).forEach((webhookId) => {
          const parameters: ITriggerParameters = state.triggers[webhookId]
          if (!parameters.channelIds || !parameters.channelIds.length) parameters.channelIds = ['all']
          parameters.channelIds.forEach((channelId) => {
            if (!state.channels[channelId] && parameters.active) state.channels[channelId] = [parameters]
            else {
              if (parameters.active) state.channels[channelId].push(parameters)
              else {
                state.channels[channelId] = [
                  ...(state.channels[channelId]?.filter((ch) => ch.webhookId !== parameters.webhookId) || []),
                ] as [ITriggerParameters]
              }
            }
          })

          if (parameters.type === 'command' && parameters.active) commandsParam.push(parameters)
        })

        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          if (commandsParam.length && data.credentials) {
            const parsedCommands: RESTPostAPIApplicationCommandsJSONBody[] = []
            commandsParam.forEach((params) => {
              let slashCommand = new SlashCommandBuilder()
                .setName(params.name!)
                .setDescription(params.description!)
                .setDMPermission(false)

              const getOption = <
                T extends
                  | SlashCommandStringOption
                  | SlashCommandNumberOption
                  | SlashCommandIntegerOption
                  | SlashCommandBooleanOption,
              >(
                option: T,
              ): T => {
                return option as T
              }

              if (params.commandFieldType === 'text') {
                slashCommand = slashCommand.addStringOption((option: SlashCommandStringOption) =>
                  getOption(option),
                ) as SlashCommandBuilder
              } else if (params.commandFieldType === 'number') {
                slashCommand = slashCommand.addNumberOption((option: SlashCommandNumberOption) =>
                  getOption(option),
                ) as SlashCommandBuilder
              } else if (params.commandFieldType === 'integer') {
                slashCommand = slashCommand.addIntegerOption((option: SlashCommandIntegerOption) =>
                  getOption(option),
                ) as SlashCommandBuilder
              } else if (params.commandFieldType === 'boolean') {
                slashCommand = slashCommand.addBooleanOption((option: SlashCommandBooleanOption) =>
                  getOption(option),
                ) as SlashCommandBuilder
              }

              parsedCommands.push(slashCommand.toJSON())
            })
            registerCommands(data.credentials.token, data.credentials.clientId, parsedCommands)
          } else if (data.credentials) {
            registerCommands(data.credentials.token, data.credentials.clientId, [])
          }
        }, 2000)

        ipc.server.emit(socket, 'trigger', true)
      } catch (e) {
        addLog(`${e}`, client)
        ipc.server.emit(socket, 'trigger', false)
      }
    },
  )
}
