import type { CallToolResult } from '@modelcontextprotocol/server';

export function toolResult<T>(result: T): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: { result },
  };
}

export function toolError(cause: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text:
          cause instanceof Error
            ? cause.message
            : 'Unexpected Spendist MCP error.',
      },
    ],
  };
}
