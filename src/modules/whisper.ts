import { spawn, ChildProcess } from 'child_process';
import { logInfo, logError } from '../utils/logger';
import { WindowManager } from './windows';
import * as path from 'path';
import { __dirname } from '../constants';
import * as fs from 'fs';

interface WhisperConfig {
    modelName?: string;
    device?: 'cpu' | 'cuda' | 'auto';
    computeType?: 'int8' | 'float16' | 'float32' | 'auto';
}

interface TranscribeOptions {
    language?: string;
    task?: 'transcribe' | 'translate';
    beamSize?: number;
    vadFilter?: boolean;
}

interface TranscriptResult {
    text: string;
    chunks?: Array<{
        timestamp: [number, number | null];
        text: string;
    }>;
    language?: string;
    language_probability?: number;
    duration?: number;
}

export class Whisper {
    private static process: ChildProcess | null = null;
    private static modelName: string | null = null;
    private static isLoading: boolean = false;
    private static isReady: boolean = false;
    private static pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
    private static readyQueue: Array<() => void> = [];

    /**
     * Python 가상환경 경로 찾기
     */
    private static getPythonPath(): string {
        const venvPath = path.join(__dirname, '.venv');
        
        // Windows
        const windowsPython = path.join(venvPath, 'Scripts', 'python.exe');

        if (fs.existsSync(windowsPython)) {
            return windowsPython;
        }
        
        // Linux/Mac
        const unixPython = path.join(venvPath, 'bin', 'python');
        if (fs.existsSync(unixPython)) {
            return unixPython;
        }
        
        logInfo(JSON.stringify({ venvPath, windowsPython, unixPython}));
        
        // 가상환경이 없으면 시스템 Python 사용
        logError('.venv 가상환경을 찾을 수 없습니다. 시스템 Python을 사용합니다.');
        return 'python';
    }

    /**
     * Python 프로세스 초기화
     */
    private static initProcess(): void {
        if (Whisper.process) {
            return;
        }

        const scriptPath = path.join(__dirname, 'whisper-server.py');
        
        // Python 스크립트 존재 확인
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Whisper 서버 스크립트를 찾을 수 없습니다: ${scriptPath}`);
        }

        const pythonPath = Whisper.getPythonPath();
        logInfo(`Whisper 서버 시작: ${scriptPath}`);
        logInfo(`Python 경로: ${pythonPath}`);

        // Python 프로세스 시작
        Whisper.process = spawn(pythonPath, [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        // stdout에서 JSON 응답 읽기
        let buffer = '';
        Whisper.process.stdout?.setEncoding('utf-8');
        Whisper.process.stdout?.on('data', (data: string) => {
            buffer += data;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 마지막 불완전한 라인 보관

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const message = JSON.parse(line);
                        Whisper.handleMessage(message);
                    } catch (error) {
                        logError('JSON 파싱 오류:', line, error);
                    }
                }
            }
        });

        // stderr 로깅
        Whisper.process.stderr?.setEncoding('utf-8');
        Whisper.process.stderr?.on('data', (data: string) => {
            logError('[Python stderr]', data);
        });

        // 프로세스 종료 처리
        Whisper.process.on('error', (error: Error) => {
            logError('Python 프로세스 오류:', error);
            Whisper.process = null;
            Whisper.isReady = false;
            Whisper.readyQueue = [];
        });

        Whisper.process.on('exit', (code: number | null) => {
            if (code !== 0 && code !== null) {
                logError(`Python 프로세스 비정상 종료: ${code}`);
            }
            Whisper.process = null;
            Whisper.isReady = false;
            Whisper.readyQueue = [];
        });
    }

    /**
     * Python 메시지 핸들러
     */
    private static handleMessage(message: any): void {
        const { type, data } = message;

        switch (type) {
            case 'ready':
                logInfo('Whisper 서버 준비 완료');
                Whisper.isReady = true;
                // 대기 중인 요청 실행
                while (Whisper.readyQueue.length > 0) {
                    const callback = Whisper.readyQueue.shift();
                    if (callback) callback();
                }
                break;

            case 'load-progress':
                logInfo(`Whisper 모델 다운로드: ${data.message}`);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-progress', data);
                break;

            case 'load-complete':
                logInfo('Whisper 모델 로드 완료');
                Whisper.isLoading = false;
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-complete', data);
                const loadResolve = Whisper.pendingRequests.get('load');
                if (loadResolve) {
                    loadResolve.resolve(data);
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
                const unloadResolve = Whisper.pendingRequests.get('unload');
                if (unloadResolve) {
                    unloadResolve.resolve();
                    Whisper.pendingRequests.delete('unload');
                }
                break;

            case 'log':
                logInfo('[Python]', data.message);
                break;

            case 'error':
                logError('Python 서버 에러:', data.error);
                break;

            default:
                logInfo(`알 수 없는 메시지 타입: ${type}`, data);
                break;
        }
    }

    /**
     * Python 프로세스에 메시지 전송
     */
    private static sendRequest(request: any): void {
        if (!Whisper.process || !Whisper.process.stdin) {
            throw new Error('Whisper 프로세스가 시작되지 않았습니다.');
        }

        const doSend = () => {
            const message = JSON.stringify(request) + '\n';
            logInfo(`Sending request to Python: ${request.type}`);
            Whisper.process!.stdin!.write(message);
        };

        // 서버가 준비되었으면 바로 전송, 아니면 큐에 추가
        if (Whisper.isReady) {
            doSend();
        } else {
            logInfo(`Queuing request until server is ready: ${request.type}`);
            Whisper.readyQueue.push(doSend);
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
            modelName = 'large-v3',
            device = 'auto',
            computeType = 'auto'
        } = config;

        // 이미 같은 모델이 로드되어 있으면 스킵
        if (Whisper.process && Whisper.modelName === modelName) {
            logInfo('Whisper 모델이 이미 로드되어 있습니다.');
            return;
        }

        Whisper.isLoading = true;
        Whisper.modelName = modelName;

        // Python 프로세스 초기화
        Whisper.initProcess();

        return new Promise<void>((resolve, reject) => {
            Whisper.pendingRequests.set('load', { resolve, reject });

            // Python 서버에 모델 로드 요청
            Whisper.sendRequest({
                type: 'load-model',
                data: {
                    modelName,
                    device,
                    computeType
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
        if (!Whisper.process) {
            throw new Error('Whisper 모델이 로드되지 않았습니다.');
        }

        const {
            language,
            task = 'transcribe',
            beamSize = 5,
            vadFilter = true
        } = options;

        logInfo(`오디오 변환 중: ${audioPath}`);

        return new Promise<TranscriptResult>((resolve, reject) => {
            Whisper.pendingRequests.set('transcribe', { resolve, reject });

            // Python 서버에 음성 인식 요청
            Whisper.sendRequest({
                type: 'transcribe',
                data: {
                    audioPath,
                    language,
                    task,
                    beamSize,
                    vadFilter
                }
            });
        });
    }

    /**
     * 모델 언로드
     */
    static async unloadModel(): Promise<void> {
        if (Whisper.process) {
            logInfo('Whisper 모델 언로드 중');

            return new Promise<void>((resolve, reject) => {
                Whisper.pendingRequests.set('unload', { resolve, reject });

                Whisper.sendRequest({
                    type: 'unload',
                    data: {}
                });

                // 타임아웃 후 프로세스 강제 종료
                setTimeout(() => {
                    if (Whisper.process) {
                        Whisper.process.kill();
                        Whisper.process = null;
                        Whisper.modelName = null;
                        resolve();
                    }
                }, 5000);
            });
        }
    }

    /**
     * 모델 정보 조회
     */
    static getModelInfo(): { loaded: boolean; modelName: string | null } {
        return {
            loaded: Whisper.process !== null,
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
