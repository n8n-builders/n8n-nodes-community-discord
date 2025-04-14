# Changelog

## Released (2025-04-13 0.7.4)

### New Features

- Added support for Discord.js v14.18.0
- Added compatibility with Node.js v23.10.0
- Added message timeout handling with improved notifications
- Enhanced trigger workflow functionality to support more event types
- Enhanced pattern matching in message triggers

### Improvements/refactoring

- Improved TypeScript type safety by removing 'any' type usages
- Enhanced Collection implementation with discord.js Collections
- Updated dependencies to remove deprecated methods
- Fixed object injection vulnerabilities
- Improved ESLint and Prettier compliance
- Improved type safety in Discord client event handlers
- Optimized channel state management for triggers
- Better handling of trigger workflows with improved active state management
- Added better handling of bot mentions in message triggers
- Improved workflow trigger activation status tracking
- Improved error handling in message update events
- Better state management for channel triggers
- Enhanced logging for workflow trigger failures

### Bug fixes

- Fixed message update trigger handling for proper channel detection
- Enhanced error logging in event handlers
- Improved error handling in workflow triggers
- Enhanced error logging for webhook triggers

## Previous Versions

## Released (2024-11-17 0.7.3)

### New Features

- Trigger: Message update
- Trigger: Thread update

## Released (2024-11-17 0.7.2)

### Improvements/refactoring

- Bug fixes for missing roleIds in triggers
- Additional dependency updates

## Released (2024-11-17 0.7.1)

### Improvements/refactoring

- Additional dependency clean-up and updates

## Released (2024-11-10 0.7.0)

### New Features

- Discord Trigger Node
- **New trigger type:** Threads - start a workflow when a new thread is created. Supports all the same parameters as the _Message_ trigger.
- **New trigger type:** Nicknames - start a workflow when a user's server nickname is updated. Supports all the same parameters as the _User Role_ trigger.
- Now listens and reacts to all trigger events from bots

### Improvements/refactoring

- Added [Node Codex](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files/)'s for both Discord Trigger and Discord Send.
- Replaced `.eslintignore`, `.eslintrc`, and `.eslintrc.js` with new `eslint.config.mjs` flat file.
- Added configuration file to support n8n's [nodelinter](https://github.com/n8n-io/nodelinter).
- Removed unnecessary dependencies, updated all remaining ones to latest version

## Released (2023-01-18 0.5.0)

### New Features

- Trigger workflow using slash commands (can be restricted to specific roles, pass a parameter)

### Improvements/refactoring

- bot/index.ts refactored into multiple files (discordClientEvents/..., ipcEvents/...)
- Discord Send node will now loop over items
- Triggers can ben listened from all (text) channels if none is specified

## Released (2022-12-16 0.4.2)

### Bug fixes

- Fix attachments webhook checking

## Released (2022-12-13 0.4.1)

### New Features

- Trigger: Attachments field

## Released (2022-11-27 0.4.0)

### New Features

- Trigger: Interaction
- Send: Persistent button/select

## Released (2022-11-26 0.3.1)

### Bug fixes

- User mention notifications are now sent

## Released (2022-11-25 0.3.0)

### New Features

- Trigger: User joins the server
- Trigger: User leaves the server
- Trigger: User presence update
- Trigger: User role added
- Trigger: User role removed
- Action : Add role to user
- Action : Remove role from user

### Bug fixes

- Bot crash when a non-administrator try to use bot "/" commands

## Released (2022-11-06 0.2.0)

### New Features

- base64 on embeds & files
- more context returned by executed nodes (trigger/send)
- type "Action" added on the Discord Send node, with one action possible at the moment: "Remove messages"
- bot customization (activity, activity type, status)

### Improvements/refactoring

- You can now send embeds without "content"

### Bug Fixes

- Error when using prompt if no placeholderId

## Released (2022-10-26 0.1.3)

### Bug Fixes

- Fix subdomain regex

## Released (2022-10-26 0.1.2)

### Improvements/refactoring

- prevent bot crashes

### Bug Fixes

- fix baseUrl
- fix placeholder animation

## Released (2022-10-26 0.1.1)

### Improvements/refactoring

- Added base url field to Discord credentials, so there is no need to use env var and have conflict with different formats
