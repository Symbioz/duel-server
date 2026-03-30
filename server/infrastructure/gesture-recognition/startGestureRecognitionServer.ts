import { createGestureRecognitionHttpServer } from './GestureRecognitionHttpServer';
import { readGestureRecognitionServerConfig } from './gestureRecognitionServerConfig';

export async function startGestureRecognitionServer(): Promise<void> {
  const config = readGestureRecognitionServerConfig();
  const server = createGestureRecognitionHttpServer();

  await new Promise<void>((resolve) => {
    server.listen(config.port, config.host, () => {
      process.stdout.write(
        `[gesture-recognition-server] listening on http://${config.host}:${config.port}\n`
      );
      resolve();
    });
  });
}

if (require.main === module) {
  startGestureRecognitionServer().catch((error) => {
    console.error('[gesture-recognition-server] failed to start:', error);
    process.exit(1);
  });
}

