# n8n-nodes-discord Development Guide

## Technology Stack & Versions

- `discord.js` v14.22.1 for Discord API integration
- `Node.js` v23.10.0 runtime
- `n8n-core` v1.111.0 for n8n core functionality
- `n8n-workflow` v1.109.0 for workflow integration
- TypeScript for type safety
- `node-ipc` v12.0.0 for inter-process communication

## Code Standards

- Never use the `any` type in TypeScript; use `unknown` only when necessary
- Follow ESLint and Prettier rules configured in the project:
  - Use single quotes for strings
  - Use semicolons at the end of statements
  - 2-space indentation
  - Maximum line length of 100 characters
  - No unused variables or imports
  - Avoid `eslint-disable` comments unless absolutely necessary
  - Follow n8n-nodes-base plugin guidelines for node implementations
  - Use simple-import-sort plugin ordering for imports
- Avoid adding unnecessary comments to show where code was added
- Prefer discord.js `Collection` over native JavaScript `Map`
- Avoid using deprecated methods from imported packages
- Avoid object injection sinks to prevent security vulnerabilities

## Architecture Overview

This package provides n8n nodes for Discord integration with these primary components:

1. **Discord Send Node** (`Discord.node.ts`)
   - Regular node for sending messages, embeds, and prompts to Discord
   - Communicates with the Discord bot via IPC

2. **Discord Trigger Node** (`DiscordTrigger.node.ts`)
   - Trigger node that starts workflows based on Discord events
   - Uses both webhooks and direct IPC communication for event handling

3. **Bot Service**
   - Background Discord bot that maintains the connection to Discord
   - Handles command registration and execution

## Event Handling Architecture

### IPC Event Handling (`ipcEvents` folder)

The `ipcEvents` folder contains handlers for IPC communication between n8n nodes and the Discord bot:

- **`trigger.ipc.ts`**: Manages trigger registration, connection tracking, and command registration

  ```typescript
  ipc.server.on('trigger', (data, socket) => {
    state.triggers[data.webhookId] = {
      /* ... */
    }
    triggerConnections.set(data.webhookId, socket)
  })
  ```

- Other IPC handlers manage interactions, messages, and bot status updates

### Discord Event Handling (`discordClientEvents` folder)

The `discordClientEvents` folder contains handlers for Discord.js events:

- Events are captured from the Discord client and transformed into appropriate trigger events
- Events are filtered based on configured triggers before being forwarded to n8n
- Common events include message creation, member updates, presence changes, and interactions

## Key Communication Patterns

### IPC Communication

The nodes and bot communicate using `node-ipc` with these patterns:

- **Trigger Registration**:

  ```typescript
  ipc.of.bot.emit('trigger', {
    ...parameters,
    baseUrl,
    webhookId,
    active: this.getWorkflow().active,
    credentials,
  })
  ```

- **Event Broadcasting**:
  ```typescript
  ipc.server.on('sendTriggerEvent', (data) => {
    const socket = triggerConnections.get(data.webhookId)
    if (socket && state.triggers[webhookId]?.active) {
      ipc.server.emit(socket, 'triggerEvent', eventData)
    }
  })
  ```

## Workflow Execution Recording

- Workflows are recorded in n8n by using `this.emit([data])` in the trigger method
- In `DiscordTrigger.node.ts`, the `triggerEvent` IPC event handler emits data to n8n

## Error Handling

Use the established error handling pattern:

```typescript
handleExecutionError.call(this, e, itemIndex, returnData)
```

## Reconnection Logic

Include reconnection handling for IPC communication:

```typescript
ipc.of.bot.on('disconnect', () => {
  setTimeout(() => {
    if (this.getWorkflow().active === true) {
      // Reconnection code...
    }
  }, 5000)
})
```
