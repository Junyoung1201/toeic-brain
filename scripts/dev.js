const { spawn } = require('child_process');
const { createServer, build } = require('vite');
const path = require('path');
const electron = require('electron');

let electronProcess = null;

async function startDev() {
    try {
        console.log('렌더러 서버 시작 중');
        process.env.BUILD_TARGET = 'renderer';
        const server = await createServer({
            configFile: path.resolve(__dirname, '../vite.config.ts'),
        });

        await server.listen();

        startElectron();

        // 프로세스 파일 변경 감지
        const chokidar = require('chokidar');
        const watcher = chokidar.watch('src/main.ts', {
            ignoreInitial: true,
        });

        watcher.on('change', async () => {
            console.log('프로세스 파일 변경됨. 다시 빌드 중');
            process.env.BUILD_TARGET = 'main';
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
