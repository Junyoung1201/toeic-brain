import { ipcMain, app } from 'electron';
import * as path from 'path';
import { onDownloadModel } from './handlers/onDownloadModel';
import { onSolveProblem } from './handlers/onSolveProblem';
import {onLoadModel} from './handlers/onLoadModel';
import {onCheckCuda} from './handlers/onCheckCuda';
import { LLM } from './modules/llm';
import { MODEL_DOWNLOAD_PATH_DEF } from './constants';

export function registerIpcHandlers(): void {

    // CUDA 확인
    ipcMain.handle('check-cuda', onCheckCuda);

    // 기본 모델 경로 가져오기
    ipcMain.handle('get-default-models-path', () => {
        return MODEL_DOWNLOAD_PATH_DEF
    });

    // 모델 다운로드
    ipcMain.handle('start-download', onDownloadModel);

    // 모델 로드
    ipcMain.handle('load-model', onLoadModel);

    // 문제 풀이
    ipcMain.handle('solve-problem', onSolveProblem);

    // 모델 정보 조회
    ipcMain.handle('get-model-info', LLM.getModelInfo);
}
