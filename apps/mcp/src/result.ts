import type { CallToolResult } from '@modelcontextprotocol/server';

export function toolResult(result: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: { result },
  };
}

export function toolError(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text:
          error instanceof Error
            ? error.message
            : 'Unexpected Spendist MCP error.',
      },
    ],
  };
}
