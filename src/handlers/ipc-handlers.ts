import { ipcMain, app } from 'electron';
import { exec } from 'child_process';
import * as path from 'path';
import { PythonManager } from '../managers/python-manager';
import { PipInstaller } from '../managers/pip-installer';
import { logInfo, logError } from '../utils/logger';

export function registerIpcHandlers(pythonManager: PythonManager, pipInstaller: PipInstaller): void {
    // CUDA 확인
    ipcMain.handle('check-cuda', async () => {
        return new Promise((resolve) => {
            exec('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', (error, stdout) => {
                if (error) {
                    resolve({ available: false, gpuName: null, vram: 0 });
                } else {
                    const [name, memory] = stdout.trim().split(',').map(s => s.trim());
                    resolve({ available: true, gpuName: name, vram: parseInt(memory, 10) });
                }
            });
        });
    });

    // 기본 모델 경로 가져오기
    ipcMain.handle('get-default-models-path', () => {
        const basePath = app.isPackaged 
            ? path.dirname(app.getPath('exe')) 
            : app.getAppPath();
        return path.join(basePath, 'models');
    });

    // 다운로드 시작
    ipcMain.handle('start-download', async (event, args) => {
        if (!pythonManager.isRunning()) {
            pythonManager.start();
        }

        const { type, url, savePath, repoId, saveDir, filename } = args;
        
        if (type === 'pytorch') {
            pythonManager.sendCommand('download_pytorch', { url, save_path: savePath });
        } else if (type === 'model') {
            pythonManager.sendCommand('download_model', { 
                repo_id: repoId, 
                save_dir: saveDir, 
                filename 
            });
        }
        
        return true;
    });

    // 모델 로드 및 문제 풀이
    ipcMain.on('load-and-solve', (event, args) => {
        if (!pythonManager.isRunning()) {
            logError('Python process not running');
            return;
        }

        const { modelPath, problem, llamaCppUrl } = args;
        pythonManager.pendingProblem = problem;
        pythonManager.lastModelPath = modelPath;
        pythonManager.configuredLlamaCppUrl = llamaCppUrl || null;
        
        logInfo('Loading model:', modelPath);
        if (pythonManager.configuredLlamaCppUrl) {
            logInfo('Configured llama-cpp-python URL:', pythonManager.configuredLlamaCppUrl);
        }
        
        pythonManager.sendCommand('load_model', { model_path: modelPath });
    });

    // 모델 로드 완료 알림
    ipcMain.on('model-loaded', (event) => {
        if (!pythonManager.isRunning() || !pythonManager.pendingProblem) {
            return;
        }
        
        logInfo('Model loaded, solving problem:', pythonManager.pendingProblem);
        pythonManager.sendCommand('solve_problem', { problem: pythonManager.pendingProblem });
        pythonManager.pendingProblem = null;
    });

    // 설치 요청 처리를 위한 Python 메시지 리스너
    // (이 부분은 PythonManager에서 직접 처리하도록 수정 필요)
}

export function setupInstallHandler(pythonManager: PythonManager, pipInstaller: PipInstaller): void {
    // Python 메시지에서 install_needed를 감지하기 위한 추가 핸들러
    // 이 부분은 PythonManager의 handleMessage에 통합될 수 있음
}
