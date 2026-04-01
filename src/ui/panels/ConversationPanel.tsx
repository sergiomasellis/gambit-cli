import { TextAttributes, type ScrollBoxRenderable } from '@opentui/core'
import type { RefObject } from 'react'

import type { ConversationMessage } from '../../conversation/conversation-types'
import { formatCompactToolSummary } from '../../lib/toolSummaries'
import { Markdown } from '../Markdown'
import { layout, rolePresentation, theme } from '../theme'

export interface ConversationPanelProps {
  messages: ConversationMessage[]
  scrollboxRef: RefObject<ScrollBoxRenderable | null>
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const timestampLabels: Record<ConversationMessage['role'], string> = {
  system: 'System',
  user: 'Sent',
  assistant: 'Responded',
  tool: 'Tool event',
}

function formatTimestamp(value: string): string {
  return timestampFormatter.format(new Date(value))
}

function formatToolStatus(value?: 'started' | 'completed' | 'failed'): string | null {
  switch (value) {
    case 'started':
      return 'running'
    case 'completed':
      return 'done'
    case 'failed':
      return 'failed'
    default:
      return null
  }
}



export function ConversationPanel({ messages, scrollboxRef }: ConversationPanelProps) {
  return (
    <scrollbox
      ref={scrollboxRef}
      scrollY
      stickyScroll
      stickyStart="bottom"
      style={{
        rootOptions: {
          flexGrow: 1,
          backgroundColor: theme.background,
        },
        contentOptions: {
          flexDirection: 'column',
          gap: 0,
          paddingY: 1,
          backgroundColor: theme.background,
        },
      }}
    >
      {messages
        .filter((message) => !message.hidden)
        .map((message) => {
          const isToolMessage = message.role === 'tool'
          const presentation = rolePresentation[message.role] ?? rolePresentation.system
          const isUser = message.role === 'user'

          if (isToolMessage) {
            const toolName = message.metadata?.toolName ?? 'tool'
            const toolStatus = formatToolStatus(message.metadata?.toolStatus) ?? 'done'
            const compactSummary = formatCompactToolSummary({
              toolName,
              status: message.metadata?.toolStatus,
              args: message.metadata?.toolArgs,
              result: message.metadata?.toolResult,
              artifactPath: message.metadata?.toolArtifactPath,
            })

            return (
              <box
                key={message.id}
                paddingX={layout.messagePaddingX}
                paddingY={0}
              >
                <text fg={theme.statusFg} attributes={TextAttributes.DIM}>
                  {`> Tool · ${toolName} · ${toolStatus}${compactSummary ? ` · ${compactSummary}` : ''}`}
                </text>
              </box>
            )
          }

          return (
            <box
              key={message.id}
              flexDirection="column"
              alignItems={isUser ? 'flex-end' : 'flex-start'}
              paddingX={layout.messagePaddingX}
              paddingY={1}
            >
              <box flexDirection="column" gap={0}>
                {/* For user, we might want right-aligned markdown. We rely on the parent alignItems='flex-end' */}
                <Markdown content={message.content} textColor={presentation.textColor} />
              </box>
              <box marginTop={1}>
                <text fg={theme.statusFg} attributes={TextAttributes.DIM}>
                  {formatTimestamp(message.timestamp)}
                </text>
              </box>
            </box>
          )
        })}
    </scrollbox>
  )
}
