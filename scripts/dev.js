const { spawn } = require('child_process');
const { createServer, build } = require('vite');
const path = require('path');
const electron = require('electron');

let electronProcess = null;

async function startDev() {
    try {
        // 1. Renderer 개발 서버 시작
        console.log('렌더러 서버 시작 중');
        process.env.BUILD_TARGET = 'renderer';
        const server = await createServer({
            configFile: path.resolve(__dirname, '../vite.config.ts'),
        });

        await server.listen();

        startElectron();

        // Main 프로세스 파일 변경 감지
        const chokidar = require('chokidar');
        const watcher = chokidar.watch('src/main.ts', {
            ignoreInitial: true,
        });

        watcher.on('change', async () => {
            console.log('Main process changed, rebuilding...');
            process.env.BUILD_TARGET = 'main';
            await build({ configFile: path.resolve(__dirname, '../vite.config.ts') });

            if (electronProcess) {
                electronProcess.kill();
                startElectron();
            }
        });

    } catch (error) {
        console.error('Dev server failed:', error);
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
