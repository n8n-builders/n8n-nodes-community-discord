import { AttachmentBuilder, Channel, Client, ColorResolvable, EmbedBuilder, Message, TextChannel } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { IDiscordNodeMessageParameters } from '../../Discord.node'
import { addLog } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('send:message', (nodeParameters: IDiscordNodeMessageParameters, socket: Socket) => {
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

            const embedFiles: AttachmentBuilder[] = []

            addLog(`send:message to ${channelId}`, client)

            let embed: EmbedBuilder | undefined
            if (nodeParameters.embed) {
              embed = new EmbedBuilder()
              if (nodeParameters.title) embed.setTitle(nodeParameters.title)
              if (nodeParameters.url) embed.setURL(nodeParameters.url)
              if (nodeParameters.description) embed.setDescription(nodeParameters.description)
              if (nodeParameters.color) embed.setColor(nodeParameters.color as ColorResolvable)
              if (nodeParameters.timestamp) embed.setTimestamp(Date.parse(nodeParameters.timestamp))
              if (nodeParameters.footerText) {
                let iconURL = nodeParameters.footerIconUrl
                if (iconURL?.match(/^data:/)) {
                  const buffer = Buffer.from(iconURL.split(',')[1], 'base64')
                  const reg = new RegExp(/data:image\/([a-z]+);base64/gi)
                  const mime = reg.exec(nodeParameters.footerIconUrl) ?? []
                  const file = new AttachmentBuilder(buffer, { name: `footer.${mime[1]}` })
                  embedFiles.push(file)
                  iconURL = `attachment://footer.${mime[1]}`
                }
                embed.setFooter({
                  text: nodeParameters.footerText,
                  ...(iconURL ? { iconURL } : {}),
                })
              }
              if (nodeParameters.imageUrl) {
                if (/^data:/.test(nodeParameters.imageUrl)) {
                  const buffer = Buffer.from(nodeParameters.imageUrl.split(',')[1], 'base64')
                  const reg = new RegExp(/data:image\/([a-z]+);base64/gi)
                  const mime = reg.exec(nodeParameters.imageUrl) ?? []
                  const file = new AttachmentBuilder(buffer, { name: `image.${mime[1]}` })
                  embedFiles.push(file)
                  embed.setImage(`attachment://image.${mime[1]}`)
                } else embed.setImage(nodeParameters.imageUrl)
              }
              if (nodeParameters.thumbnailUrl) {
                if (/^data:/.test(nodeParameters.thumbnailUrl)) {
                  const buffer = Buffer.from(nodeParameters.thumbnailUrl.split(',')[1], 'base64')
                  const reg = new RegExp(/data:image\/([a-z]+);base64/gi)
                  const mime = reg.exec(nodeParameters.thumbnailUrl) ?? []
                  const file = new AttachmentBuilder(buffer, { name: `thumbnail.${mime[1]}` })
                  embedFiles.push(file)
                  embed.setThumbnail(`attachment://thumbnail.${mime[1]}`)
                } else embed.setThumbnail(nodeParameters.thumbnailUrl)
              }
              if (nodeParameters.authorName) {
                let iconURL = nodeParameters.authorIconUrl
                if (iconURL?.match(/^data:/)) {
                  const buffer = Buffer.from(iconURL.split(',')[1], 'base64')
                  const reg = new RegExp(/data:image\/([a-z]+);base64/gi)
                  const mime = reg.exec(nodeParameters.authorIconUrl) ?? []
                  const file = new AttachmentBuilder(buffer, { name: `author.${mime[1]}` })
                  embedFiles.push(file)
                  iconURL = `attachment://author.${mime[1]}`
                }
                embed.setAuthor({
                  name: nodeParameters.authorName,
                  ...(iconURL ? { iconURL } : {}),
                  ...(nodeParameters.authorUrl ? { url: nodeParameters.authorUrl } : {}),
                })
              }
              if (nodeParameters.fields?.field) {
                nodeParameters.fields.field.forEach((field: { name?: string; value?: string; inline?: boolean }) => {
                  if (embed && field.name && field.value)
                    embed.addFields({
                      name: field.name,
                      value: field.value,
                      inline: field.inline,
                    })
                  else if (embed) embed.addFields({ name: '\u200B', value: '\u200B' })
                })
              }
            }

            let mentions = ''
            nodeParameters.mentionRoles.forEach((role: string) => {
              mentions += ` <@&${role}>`
            })

            let content = ''
            if (nodeParameters.content) content += nodeParameters.content
            if (mentions) content += mentions

            let files: (AttachmentBuilder | string | Buffer)[] = []
            if (nodeParameters.files?.file) {
              files = nodeParameters.files.file.map((file: { url: string }) => {
                if (/^data:/.test(file.url)) {
                  return Buffer.from(file.url.split(',')[1], 'base64')
                }
                return file.url
              })
            }
            if (embedFiles.length) files = files.concat(embedFiles)

            const sendObject = {
              content: content ?? '',
              ...(embed ? { embeds: [embed] } : {}),
              ...(files.length ? { files } : {}),
            }

            if (nodeParameters.triggerPlaceholder && executionMatching?.placeholderId) {
              const realPlaceholderId = state.placeholderMatching[executionMatching.placeholderId]
              if (realPlaceholderId) {
                const message = await channel.messages.fetch(realPlaceholderId).catch((e: Error) => {
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
                      await message.edit(sendObject).catch((e: Error) => {
                        addLog(`${e}`, client)
                      })
                      ipc.server.emit(socket, 'send:message', {
                        channelId,
                        messageId: message.id,
                      })
                    }
                  }
                  await retry()
                  return
                }
              }
            }
            const message = (await (channel as TextChannel).send(sendObject).catch((e: Error) => {
              addLog(`${e}`, client)
            })) as Message
            ipc.server.emit(socket, 'send:message', { channelId, messageId: message.id })
          })
          .catch((e: Error) => {
            addLog(`${e}`, client)
            ipc.server.emit(socket, 'send:message', false)
          })
      }
    } catch (e) {
      addLog(`${e}`, client)
      ipc.server.emit(socket, 'send:message', false)
    }
  })
}
