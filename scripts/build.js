import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildAll() {
  try {
    console.log('메인 프로세스 빌드 중...');
    process.env.BUILD_TARGET = 'main';
    await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

    console.log('Worker 프로세스 빌드 중...');
    process.env.BUILD_TARGET = 'worker';
    await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

    console.log('렌더러 프로세스 빌드 중...');
    process.env.BUILD_TARGET = 'renderer';
    await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

    console.log('빌드 완료!');
  } catch (error) {
    console.error('빌드 실패:', error);
    process.exit(1);
  }
}

buildAll();
