import { Worker } from 'worker_threads';
import { logInfo, logError } from '../utils/logger';
import { WindowManager } from './windows';
import * as path from 'path';
import {__dirname} from '../constants';

interface WhisperConfig {
    modelName?: string;
    device?: 'cpu' | 'gpu';
    quantized?: boolean;
}

interface TranscribeOptions {
    language?: string;
    task?: 'transcribe' | 'translate';
    chunk_length_s?: number;
    stride_length_s?: number;
    return_timestamps?: boolean;
}

interface TranscriptResult {
    text: string;
    chunks?: Array<{
        timestamp: [number, number | null];
        text: string;
    }>;
}

export class Whisper {
    private static worker: Worker | null = null;
    private static modelName: string | null = null;
    private static isLoading: boolean = false;
    private static pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

    /**
     * Worker 초기화
     */
    private static initWorker(): void {
        if (Whisper.worker) {
            return;
        }

        const workerPath = path.join(__dirname, 'workers', 'whisper-worker.js');
        Whisper.worker = new Worker(workerPath);

        Whisper.worker.on('message', (message: any) => {
            Whisper.handleWorkerMessage(message);
        });

        Whisper.worker.on('error', (error: Error) => {
            logError('Worker 오류:', error);
        });

        Whisper.worker.on('exit', (code: number) => {
            if (code !== 0) {
                logError(`Worker 비정상 종료: ${code}`);
            }
            Whisper.worker = null;
        });
    }

    /**
     * Worker 메시지 핸들러
     */
    private static handleWorkerMessage(message: any): void {
        const { type, data } = message;

        switch (type) {
            case 'ready':
                logInfo('Whisper Worker 준비 완료');
                break;

            case 'load-status':
                logInfo(data.message);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-status', data);
                break;

            case 'load-progress':
                logInfo(`Whisper 모델 다운로드 중: ${data.percentage}%`);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-progress', data);
                break;

            case 'load-complete':
                logInfo('Whisper 모델 로드 완료');
                Whisper.isLoading = false;
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-complete', data);
                const loadResolve = Whisper.pendingRequests.get('load');
                if (loadResolve) {
                    loadResolve.resolve();
                    Whisper.pendingRequests.delete('load');
                }
                break;

            case 'load-error':
                logError('Whisper 모델 로드 실패:', data.error);
                Whisper.isLoading = false;
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-error', data);
                const loadReject = Whisper.pendingRequests.get('load');
                if (loadReject) {
                    loadReject.reject(new Error(data.error));
                    Whisper.pendingRequests.delete('load');
                }
                break;

            case 'transcribe-status':
                logInfo(data.message);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-transcribe-status', data);
                break;

            case 'transcribe-complete':
                logInfo('오디오 인식 완료');
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-transcribe-complete', data);
                const transcribeResolve = Whisper.pendingRequests.get('transcribe');
                if (transcribeResolve) {
                    transcribeResolve.resolve(data);
                    Whisper.pendingRequests.delete('transcribe');
                }
                break;

            case 'transcribe-error':
                logError('오디오 변환 실패:', data.error);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-transcribe-error', data);
                const transcribeReject = Whisper.pendingRequests.get('transcribe');
                if (transcribeReject) {
                    transcribeReject.reject(new Error(data.error));
                    Whisper.pendingRequests.delete('transcribe');
                }
                break;

            case 'unload-complete':
                logInfo('Whisper 모델 언로드 완료');
                break;

            case 'log':
                logInfo('[Worker]', data.message);
                break;

            case 'error':
                logError('Worker 에러:', data.error);
                break;
        }
    }

    /**
     * Whisper 모델 로드
     */
    static async loadModel(config: WhisperConfig = {}): Promise<void> {
        if (Whisper.isLoading) {
            throw new Error('Whisper model is already loading');
        }

        const {
            modelName = 'Xenova/whisper-large-v3',
            device = 'cpu',
            quantized = true
        } = config;

        // 이미 같은 모델이 로드되어 있으면 스킵
        if (Whisper.worker && Whisper.modelName === modelName) {
            logInfo('Whisper 모델이 이미 로드되어 있습니다.');
            return;
        }

        Whisper.isLoading = true;
        Whisper.modelName = modelName;

        // Worker 초기화
        Whisper.initWorker();

        return new Promise<void>((resolve, reject) => {
            Whisper.pendingRequests.set('load', { resolve, reject });

            // Worker에 모델 로드 요청
            Whisper.worker?.postMessage({
                type: 'load-model',
                data: {
                    modelName,
                    quantized
                }
            });
        });
    }

    /**
     * 오디오 파일을 텍스트로 변환
     */
    static async transcribe(
        audioPath: string,
        options: TranscribeOptions = {}
    ): Promise<TranscriptResult> {
        if (!Whisper.worker) {
            throw new Error('Whisper 모델이 로드되지 않았습니다.');
        }

        const {
            language = 'english',
            task = 'transcribe',
            chunk_length_s = 30,
            stride_length_s = 5,
            return_timestamps = false
        } = options;

        logInfo(`오디오 변환 중: ${audioPath}`);

        return new Promise<TranscriptResult>((resolve, reject) => {
            Whisper.pendingRequests.set('transcribe', { resolve, reject });

            // Worker에 음성 인식 요청
            Whisper.worker?.postMessage({
                type: 'transcribe',
                data: {
                    audioPath,
                    language,
                    task,
                    chunk_length_s,
                    stride_length_s,
                    return_timestamps
                }
            });
        });
    }

    /**
     * 모델 언로드
     */
    static unloadModel(): void {
        if (Whisper.worker) {
            logInfo('Whisper 모델 언로드 중');
            
            Whisper.worker.postMessage({
                type: 'unload',
                data: {}
            });

            // Worker 종료
            Whisper.worker.terminate();
            Whisper.worker = null;
            Whisper.modelName = null;
        }
    }

    /**
     * 모델 정보 조회
     */
    static getModelInfo(): { loaded: boolean; modelName: string | null } {
        return {
            loaded: Whisper.worker !== null,
            modelName: Whisper.modelName
        };
    }

    /**
     * 로딩 중 여부 확인
     */
    static isModelLoading(): boolean {
        return Whisper.isLoading;
    }
}
