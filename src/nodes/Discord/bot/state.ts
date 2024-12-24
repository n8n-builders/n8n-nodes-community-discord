interface Trigger {
  webhookId: string
  channelIds: string[]
  roleIds: string[]
  roleUpdateIds: string[]
  type: string
  pattern?: string
  value?: string
  name?: string
  description?: string
  commandFieldType?: string
  commandFieldDescription?: string
  commandFieldRequired?: boolean
  caseSensitive?: boolean
  botMention?: boolean
  placeholder?: string
  active: boolean
  presence?: string
  nick?: string
  interactionMessageId?: string
}

interface Channel {
  webhookId: string
  roleIds: string[]
  roleUpdateIds: string[]
  type: string
  pattern?: string
  value?: string
  name?: string
  description?: string
  commandFieldType?: string
  commandFieldDescription?: string
  commandFieldRequired?: boolean
  caseSensitive?: boolean
  botMention?: boolean
  placeholder?: string
  presence?: string
  nick?: string
  interactionMessageId?: string
}

interface State {
  ready: boolean
  login: boolean
  testMode: boolean
  clientId: string
  token: string
  baseUrl: string
  triggers: { [key: string]: Trigger }
  channels: { [key: string]: Channel[] }
  logs: string[]
  autoLogs: boolean
  autoLogsChannelId: string
  placeholderMatching: { [key: string]: string }
  placeholderWaiting: { [key: string]: boolean }
  executionMatching: { [key: string]: any }
  promptData: { [key: string]: any }
}

const state: State = {
  ready: false,
  login: false,
  testMode: false,
  clientId: '',
  token: '',
  baseUrl: '',
  triggers: {},
  channels: {},
  logs: [],
  autoLogs: false,
  autoLogsChannelId: '',
  placeholderMatching: {},
  placeholderWaiting: {},
  executionMatching: {},
  promptData: {},
}

export default state
