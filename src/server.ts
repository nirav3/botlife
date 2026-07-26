import 'dotenv/config';
import path from 'path';
import app from './app';
import { ensurePlansSeeded } from './services/planSeed.service';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // bind to all network interfaces

// A rejected promise anywhere with no .catch (a floating async call, a
// missed await) otherwise crashes the whole process for every connected
// user with no useful log — surface it instead of letting Node's default
// "throw and exit" behavior take over silently.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// An uncaught synchronous throw leaves the process in a state Node no
// longer guarantees is safe to keep serving requests from, so log with
// full context and exit deliberately rather than limping on.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

async function start() {
  await ensurePlansSeeded();

  const server = app.listen(parseInt(String(PORT)), HOST, () => {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : PORT;

    console.log(`\n🚀 BodLife running on:`);
    console.log(`   Local:    http://localhost:${port}`);
    console.log(`   Network:  http://192.168.68.67:${port}`);
    console.log(`   API docs: http://192.168.68.67:${port}/docs`);
    console.log(`   Env:      ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
