import { parseLaunchOptions } from './app/launch-options';
import { cleanupAllMCPClients } from './tools/mcp';

const launchOptions = parseLaunchOptions(Bun.argv.slice(2));

if (launchOptions.headless) {
  const { runHeadless } = await import('./app/headless-runner');
  const exitCode = await runHeadless({
    headless: launchOptions.headless,
    sessionMode: launchOptions.mode,
    resumeConversationId: launchOptions.conversationId,
  });
  process.exit(exitCode);
}

const { createCliRenderer } = await import('@opentui/core');
const { createRoot } = await import('@opentui/react');
const { App } = await import('./App');

let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;
let shutdownRequested = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shutdownRequested) return;
  shutdownRequested = true;
  try {
    renderer?.destroy();
  } catch {
    // ignore renderer teardown errors
  }
  try {
    await Promise.race([
      cleanupAllMCPClients(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(signal === 'SIGINT' ? 130 : 0);
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

try {
  renderer = await createCliRenderer();
  createRoot(renderer).render(<App />);
} catch (error) {
  console.error('Failed to start Gambit:', error);
  process.exitCode = 1;
}
