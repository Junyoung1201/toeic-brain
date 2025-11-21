import { spawn } from 'child_process';
import { createServer, build } from 'vite';
import path from 'path';
import electron from 'electron';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let electronProcess = null;

async function startDev() {
    try {
        console.log('렌더러 서버 시작 중');
        process.env.BUILD_TARGET = 'renderer';
        const server = await createServer({
            configFile: path.resolve(__dirname, '../vite.config.ts'),
        });

        await server.listen();

        // Worker 빌드
        console.log('Worker 빌드 중');
        process.env.BUILD_TARGET = 'worker';
        await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

        startElectron();

        // 메인 프로세스 파일 변경 감지
        const mainWatcher = chokidar.watch('src/main.ts', {
            ignoreInitial: true,
        });

        mainWatcher.on('change', async () => {
            console.log('메인 프로세스 파일 변경됨. 다시 빌드 중');
            process.env.BUILD_TARGET = 'main';
            await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

            if (electronProcess) {
                electronProcess.kill();
                startElectron();
            }
        });

        // Worker 파일 변경 감지
        const workerWatcher = chokidar.watch('src/workers/**/*.ts', {
            ignoreInitial: true,
        });

        workerWatcher.on('change', async () => {
            console.log('Worker 파일 변경됨. 다시 빌드 중');
            process.env.BUILD_TARGET = 'worker';
            await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

            if (electronProcess) {
                electronProcess.kill();
                startElectron();
            }
        });

    } catch (error) {
        console.error('개발 환경 서버 시작 실패:', error);
        process.exit(1);
    }
}

function startElectron() {
    process.env.NODE_ENV = 'development';
    electronProcess = spawn(electron, ['.'], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' },
    });

    electronProcess.on('exit', (code) => {
        if (code !== null) {
            process.exit(code);
        }
    });
}

startDev();
