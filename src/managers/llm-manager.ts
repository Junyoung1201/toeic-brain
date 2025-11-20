import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logInfo, logError } from '../utils/logger';

interface LLMConfig {
    modelPath: string;
    maxTokens?: number;
    temperature?: number;
}

export class LLMManager {
    private window: BrowserWindow | null = null;
    private model: any = null;
    private context: any = null;
    private session: any = null;
    private modelPath: string | null = null;
    private isLoading: boolean = false;
    private llamaModule: any = null;

    setWindow(window: BrowserWindow) {
        this.window = window;
    }

    private sendToRenderer(channel: string, ...args: any[]) {
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send(channel, ...args);
        }
    }

    /**
     * node-llama-cpp 동적 로드
     */
    private async loadLlamaModule() {
        if (!this.llamaModule) {
            this.llamaModule = await import('node-llama-cpp');
        }
        return this.llamaModule;
    }

    /**
     * GGUF 모델 로드
     */
    async loadModel(config: LLMConfig): Promise<void> {
        if (this.isLoading) {
            throw new Error('Model is already loading');
        }

        if (this.model && this.modelPath === config.modelPath) {
            logInfo('Model already loaded');
            return;
        }

        try {
            this.isLoading = true;
            const { modelPath, maxTokens = 4096 } = config;

            // 파일 존재 확인
            if (!fs.existsSync(modelPath)) {
                throw new Error(`Model file not found: ${modelPath}`);
            }

            const fileSize = fs.statSync(modelPath).size;
            logInfo(`Loading model: ${modelPath}`);
            logInfo(`File size: ${(fileSize / (1024 ** 3)).toFixed(2)} GB`);

            this.sendToRenderer('model-load-status', {
                message: 'Loading LLM model...',
                path: modelPath,
                size: fileSize
            });

            // node-llama-cpp 동적 로드
            logInfo('Loading node-llama-cpp module...');
            const { getLlama, LlamaChatSession } = await this.loadLlamaModule();

            // llama.cpp 인스턴스 가져오기
            logInfo('Initializing llama.cpp...');
            const llama = await getLlama();

            // 모델 로드
            logInfo('Loading GGUF model...');
            this.sendToRenderer('model-load-status', {
                message: 'Loading GGUF model with llama.cpp...'
            });

            this.model = await llama.loadModel({
                modelPath: modelPath,
            });

            // 컨텍스트 생성
            logInfo('Creating model context...');
            this.context = await this.model.createContext({
                contextSize: maxTokens,
            });

            // 세션 생성
            logInfo('Creating chat session...');
            this.session = new LlamaChatSession({
                contextSequence: this.context.getSequence(),
            });

            this.modelPath = modelPath;

            logInfo('Model loaded successfully');
            this.sendToRenderer('model-load-complete', { path: modelPath });

        } catch (error) {
            logError('Failed to load model:', error);
            this.sendToRenderer('model-load-error', { error: String(error) });
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 문제 해결 (텍스트 생성)
     */
    async solveProblem(problemText: string): Promise<string> {
        if (!this.session) {
            throw new Error('Model not loaded. Please load a model first.');
        }

        try {
            this.sendToRenderer('solve-status', { message: 'Solving problem...' });

            // 1단계: LLM이 자유롭게 답변하도록
            const firstPrompt = `You are an expert TOEIC test solver. Analyze the following TOEIC question and select the correct answer.

### Questions
${problemText}

Think carefully and provide your answer:`;

            logInfo('Step 1: Getting answer from LLM...');

            const firstResponse = await this.session.prompt(firstPrompt, {
                maxTokens: 100,
                temperature: 0.0,
                topK: 1,
                topP: 0.1,
            });

            logInfo('LLM first response:', firstResponse);

            // 2단계: 응답을 JSON으로 변환 요청
            const secondPrompt = `Convert your previous answer to this exact JSON format:
{"question number": "answer letter", ...}

answer letter is (A, B, C, or D). Output only the JSON, nothing else.`;

            logInfo('Step 2: Converting to JSON...');

            const jsonResponse = await this.session.prompt(secondPrompt, {
                //maxTokens: 150,
                temperature: 0.0,
                topK: 1,
                topP: 0.1,
            });

            logInfo('');
            logInfo('[LLM JSON Response]');
            logInfo(jsonResponse);
            logInfo('');

            let answers = {};

            // JSON 파싱 시도
            try {
                // JSON 부분만 추출

                answers = JSON.parse(jsonResponse) as { [questioNumber: string]: string };

            } catch (parseError) {
                logError('JSON parse error:', parseError);
            }

            this.sendToRenderer('solve-complete', answers);
            return JSON.stringify(answers);

        } catch (error) {
            logError('Failed to solve problem:', error);
            this.sendToRenderer('solve-error', { error: String(error) });
            throw error;
        }
    }

    /**  모델 언로드  */
    async unloadModel(): Promise<void> {
        if (this.session) {
            this.session = null;
        }
        if (this.context) {
            await this.context.dispose();
            this.context = null;
        }
        if (this.model) {
            await this.model.dispose();
            this.model = null;
        }
        this.modelPath = null;
        logInfo('Model unloaded');
    }

    /**
     * 현재 로드된 모델 정보
     */
    getModelInfo(): { path: string | null; isLoaded: boolean } {
        return {
            path: this.modelPath,
            isLoaded: this.model !== null
        };
    }
}

export const llmManager = new LLMManager();
