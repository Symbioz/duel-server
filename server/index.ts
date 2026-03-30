import { HttpServer } from './infrastructure/http/HttpServer';
import { loadAppConfig } from '../app.config';
import { DependencyInjection } from './app-configuration/dependencyInjection';
import { getLocalIpAddress } from './infrastructure/utils/networkUtils';

async function main() {
  console.log('Starting Duel Server...\n');
  const appConfig = loadAppConfig();
  const { host, port, security } = appConfig;
  const securityConfig = security;
  const accessKeyQuery = `k=${encodeURIComponent(securityConfig.controllerAccessKey)}`;

  // Setup HTTP server
  const httpServer = new HttpServer(port, host, securityConfig.controllerAccessKey);

  // Setup application (DI, use cases, transport)
  const dependencyInjection = new DependencyInjection(httpServer, securityConfig, appConfig.voxtral);

  await httpServer.listen();

  const localIp = getLocalIpAddress();
  console.log(`\nServer running.\n`);
  console.log(`Controller page:`);
  console.log(`   http://${localIp}:${port}/controller?${accessKeyQuery}`);
  console.log(`   http://localhost:${port}/controller?${accessKeyQuery}`);
  console.log(`\nWebSocket: ws://${localIp}:${port}/ws/controller`);
  console.log(`\nApp config:`);
  console.log(`   host=${appConfig.host}`);
  console.log(`   port=${appConfig.port}`);
  console.log(`   envFilePath=${appConfig.envFilePath}`);
  console.log(`\nSecurity:`);
  console.log(`   maxControllers=${securityConfig.maxControllers}`);
  console.log(`   wsRateLimitPerSec=${securityConfig.wsRateLimitPerSecond}`);
  console.log(`   wsMaxPayloadBytes=${securityConfig.wsMaxPayloadBytes}`);
  if (securityConfig.allowedOrigins.length > 0) {
    console.log(`   allowedOrigins=${securityConfig.allowedOrigins.join(', ')}`);
  }
  if (securityConfig.isEphemeralAccessKey) {
    console.log('   accessKey source=generated for this process');
  }
  console.log(`\nOpen the controller page on your phone and draw gestures.\n`);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    await dependencyInjection.shutdown();
    await httpServer.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

