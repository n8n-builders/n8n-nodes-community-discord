import { Client, IntentsBitField, Partials } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'
import Ipc from 'node-ipc'

import guildMemberAdd from './discordClientEvents/guildMemberAdd.event'
import guildMemberRemove from './discordClientEvents/guildMemberRemove.event'
import guildMemberUpdate from './discordClientEvents/guildMemberUpdate.event'
import interactionCreateCmd from './discordClientEvents/interactionCreateCmd.event'
import interactionCreateUI from './discordClientEvents/interactionCreateUI.event'
import messageCreate from './discordClientEvents/messageCreate.event'
import messageUpdate from './discordClientEvents/messageUpdate.event'
import presenceUpdate from './discordClientEvents/presenceUpdate.event'
import threadCreate from './discordClientEvents/threadCreate.event'
import threadUpdate from './discordClientEvents/threadUpdate.event'
import botStatus from './ipcEvents/botStatus.ipc'
import credentials from './ipcEvents/credentials.ipc'
import execution from './ipcEvents/execution.ipc'
import listChannels from './ipcEvents/listChannels.ipc'
import listRoles from './ipcEvents/listRoles.ipc'
import sendAction from './ipcEvents/sendAction.ipc'
import sendMessage from './ipcEvents/sendMessage.ipc'
import sendPrompt from './ipcEvents/sendPrompt.ipc'
import trigger from './ipcEvents/trigger.ipc'

export default function bot() {
  try {
    // Configure IPC
    Ipc.config.id = 'bot'
    Ipc.config.retry = 1500
    Ipc.config.silent = true

    // Create a new Discord client with required intents for modern Discord API
    const client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    })

    // Initialize IPC server
    Ipc.serve(() => {
      // Register Discord client events
      guildMemberAdd(client)
      guildMemberRemove(client)
      guildMemberUpdate(client)
      interactionCreateCmd(client)
      interactionCreateUI(client)
      messageCreate(client)
      messageUpdate(client)
      presenceUpdate(client)
      threadCreate(client)
      threadUpdate(client)

      // Register IPC server events
      botStatus(Ipc, client)
      credentials(Ipc, client)
      execution(Ipc, client)
      listChannels(Ipc, client)
      listRoles(Ipc, client)
      sendAction(Ipc, client)
      sendMessage(Ipc, client)
      sendPrompt(Ipc, client)
      trigger(Ipc, client)
    })

    Ipc.server.start()
  } catch (e) {
    LoggerProxy.error('Discord bot startup failed', { error: e instanceof Error ? e.message : String(e) })
  }
}
