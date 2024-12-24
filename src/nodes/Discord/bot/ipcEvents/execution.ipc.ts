import axios from 'axios'
import { Client } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { addLog, IExecutionData } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('execution', (data: IExecutionData, socket: Socket) => {
    try {
      ipc.server.emit(socket, 'execution', true)
      if (data.executionId && data.channelId) {
        state.executionMatching[data.executionId] = {
          channelId: data.channelId,
          ...(data.userId ? { userId: data.userId } : {}),
        }
        if (data.placeholderId && data.apiKey && data.baseUrl) {
          state.executionMatching[data.executionId].placeholderId = data.placeholderId
          const checkExecution = (placeholderId: string, executionId: string, apiKey: string, baseUrl: string) => {
            const headers = {
              accept: 'application/json',
              'X-N8N-API-KEY': apiKey,
            }
            axios
              .get(`${data.baseUrl}/executions/${executionId}`, { headers })
              .then((res) => {
                if (res?.data?.finished === false && res.data.stoppedAt === null) {
                  setTimeout(() => {
                    if (state.placeholderMatching[placeholderId])
                      checkExecution(placeholderId, executionId, apiKey, baseUrl)
                  }, 3000)
                } else {
                  Reflect.deleteProperty(state.placeholderMatching, placeholderId)
                  Reflect.deleteProperty(state.executionMatching, data.executionId)
                }
              })
              .catch((e) => e)
          }
          checkExecution(data.placeholderId, data.executionId, data.apiKey, data.baseUrl)
        }
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
