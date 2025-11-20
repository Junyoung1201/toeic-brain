import { ipcMain, app } from 'electron';
import { exec } from 'child_process';
import * as path from 'path';
import { logInfo, logError } from '../utils/logger';
import { llmManager } from '../managers/llm-manager';
import { modelDownloader } from '../managers/model-downloader';

export function registerIpcHandlers(): void {
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

    // 모델 다운로드
    ipcMain.handle('start-download', async (event, args) => {
        const { type, repoId, saveDir, filename } = args;
        
        if (type === 'model') {
            try {
                const modelPath = await modelDownloader.downloadModel(repoId, filename, saveDir);
                return { success: true, path: modelPath };
            } catch (error) {
                logError('Download failed:', error);
                return { success: false, error: String(error) };
            }
        }
        
        return { success: false, error: 'Invalid download type' };
    });

    // 모델 로드
    ipcMain.handle('load-model', async (event, args) => {
        const { modelPath } = args;
        
        try {
            logInfo('Loading model:', modelPath);
            await llmManager.loadModel({ modelPath });
            return { success: true };
        } catch (error) {
            logError('Failed to load model:', error);
            return { success: false, error: String(error) };
        }
    });

    // 문제 풀이
    ipcMain.handle('solve-problem', async (event, args) => {
        const { questionText } = args;
        
        try {
            logInfo("문제 푸는 중..");

            const answer = await llmManager.solveProblem(questionText);
            return { success: true, answer };

        } catch (error) {
            logError("문제 풀이 실패:", error);
            return { success: false, error: String(error) };
        }
    });

    // 모델 정보 조회
    ipcMain.handle('get-model-info', async () => {
        return llmManager.getModelInfo();
    });
}
