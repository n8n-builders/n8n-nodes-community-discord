import {
  ActionRowBuilder,
  ButtonBuilder,
  Channel,
  Client,
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  SelectMenuBuilder,
  SelectMenuComponentOptionData,
  TextChannel,
} from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { IDiscordNodePromptParameters } from '../../Discord.node'
import { addLog, execution, placeholderLoading, pollingPromptData } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('send:prompt', (nodeParameters: IDiscordNodePromptParameters, socket: Socket) => {
    try {
      if (state.ready) {
        const executionMatching = state.executionMatching[nodeParameters.executionId]
        let channelId = ''
        if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel) channelId = executionMatching?.channelId
        else channelId = nodeParameters.channelId

        client.channels
          .fetch(channelId)
          .then(async (channel: Channel | null): Promise<void> => {
            if (!channel || !channel.isTextBased()) return

            addLog(`send:prompt to ${channelId}`, client)

            const promptProcessing = async (message: Message) => {
              state.promptData[message.id] = nodeParameters
              await pollingPromptData(message, nodeParameters.content, nodeParameters.timeout, client).catch(
                (e: unknown) => addLog(`${e}`, client),
              )
              ipc.server.emit(socket, 'send:prompt', state.promptData[message.id])
              const messageId = message.id
              if (messageId in state.promptData) {
                Reflect.deleteProperty(state.promptData, messageId as keyof typeof state.promptData)
              }
              if (nodeParameters.placeholder) {
                const message = await (channel as TextChannel).send({ content: nodeParameters.placeholder })

                await execution(
                  nodeParameters.executionId,
                  message.id,
                  channel.id,
                  await placeholderLoading(
                    message as Message,
                    (message as Message).id.toString(),
                    nodeParameters.placeholder,
                  ),
                  nodeParameters.baseUrl,
                ).catch((e) => e)
                await placeholderLoading(message as Message, message.id, nodeParameters.placeholder)
              }
            }

            let row: ActionRowBuilder

            if (nodeParameters.buttons) {
              const buttons: ButtonBuilder[] = []
              ;(nodeParameters.buttons.button ?? []).forEach(
                (button: { label: string; value: string; style: number }) => {
                  buttons.push(
                    new ButtonBuilder().setCustomId(button.value).setLabel(button.label).setStyle(button.style),
                  )
                },
              )
              row = new ActionRowBuilder().addComponents(buttons)
            } else {
              const options: SelectMenuComponentOptionData[] = []
              ;(nodeParameters.select.select ?? []).forEach(
                (select: { label: string; description: string; value: string }) => {
                  options.push({
                    label: select.label,
                    ...(select.description ? { description: select.description } : {}),
                    value: select.value,
                  })
                },
              )
              const select = new SelectMenuBuilder()
                .setCustomId('select')
                .setPlaceholder('...')
                .setMinValues(nodeParameters.persistent ? nodeParameters.minSelect : 1)
                .setMaxValues(nodeParameters.persistent ? nodeParameters.maxSelect : 1)
                .addOptions(options)
              row = new ActionRowBuilder().addComponents(select)
            }

            let mentions = ''
            if (nodeParameters.mentionRoles) {
              nodeParameters.mentionRoles.forEach((role: string) => {
                mentions += ` <@&${role}>`
              })
            }

            let content = ''
            if (nodeParameters.content) content += nodeParameters.content
            if (mentions) content += mentions

            const sendObject = {
              content: content + (nodeParameters.timeout ? ` (${nodeParameters.timeout}s)` : ''),
              components: [row],
            }

            if (nodeParameters.triggerPlaceholder && executionMatching?.placeholderId) {
              const realPlaceholderId = state.placeholderMatching[executionMatching.placeholderId]
              if (realPlaceholderId) {
                const message = await channel.messages.fetch(realPlaceholderId).catch((e: unknown) => {
                  addLog(`${e}`, client)
                })
                delete state.placeholderMatching[
                  executionMatching.placeholderId as keyof typeof state.placeholderMatching
                ]
                if (message?.edit) {
                  let retryCount = 0
                  const retry = async () => {
                    if (state.placeholderWaiting[executionMatching.placeholderId] && retryCount < 10) {
                      retryCount++
                      setTimeout(() => retry(), 300)
                    } else {
                      await message.edit(sendObject as MessageEditOptions).catch((e: unknown) => {
                        addLog(`${e}`, client)
                      })
                      await promptProcessing(message)
                    }
                  }
                  await retry()
                  return
                }
              }
            }
            if (executionMatching?.placeholderId)
              delete state.placeholderMatching[
                executionMatching.placeholderId as keyof typeof state.placeholderMatching
              ]

            let message: Message | undefined

            if (nodeParameters.updateMessageId) {
              const messageToEdit = await channel.messages.fetch(nodeParameters.updateMessageId).catch((e: unknown) => {
                addLog(`${e}`, client)
              })
              if (messageToEdit?.edit) {
                message = (await messageToEdit.edit(sendObject as MessageEditOptions).catch((e: unknown) => {
                  addLog(`${e}`, client)
                  return undefined
                })) as Message<boolean> | undefined
              }
            } else {
              message = (await (channel as TextChannel).send(sendObject as MessageCreateOptions).catch((e: unknown) => {
                addLog(`${e}`, client)
                return undefined
              })) as Message<boolean> | undefined
            }

            if (message?.id && !nodeParameters.persistent) {
              await promptProcessing(message)
            } else if (message?.id && nodeParameters.persistent) {
              ipc.server.emit(socket, 'send:prompt', {
                channelId: channel.id,
                messageId: message.id,
              })
            }
          })
          .catch((e: unknown) => {
            addLog(`${e}`, client)
            ipc.server.emit(socket, 'send:prompt', false)
          })
      }
    } catch (e) {
      addLog(`${e}`, client)
      ipc.server.emit(socket, 'send:prompt', false)
    }
  })
}
