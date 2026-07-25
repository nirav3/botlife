import 'dotenv/config';
import path from 'path';
import app from './app';
import { ensurePlansSeeded } from './services/planSeed.service';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // bind to all network interfaces

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

start();
