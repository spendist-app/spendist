import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createSpendistMcpServer } from './server';

const supabaseUrl = process.env['SUPABASE_URL'];
const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
const accessToken = process.env['SPENDIST_ACCESS_TOKEN'];
if (!supabaseUrl || !publishableKey || !accessToken) {
  process.stderr.write(
    'SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SPENDIST_ACCESS_TOKEN are required.\n'
  );
  process.exitCode = 1;
} else {
  serveStdio(
    () =>
      createSpendistMcpServer({
        supabaseUrl,
        publishableKey,
        accessToken,
        clientId: process.env['MCP_CLIENT_ID'] ?? 'stdio',
      }),
    { onerror: (error) => process.stderr.write(`${error.message}\n`) }
  );
}
