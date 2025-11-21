import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logInfo, logError } from '../utils/logger';
import { WindowManager } from './windows';
import { MODEL_CONTEXT_SIZE_DEF } from '../constants';

interface LLMConfig {
    modelPath: string;
    maxTokens?: number;
    temperature?: number;
}

export class LLM {
    private static model: any = null;
    private static context: any = null;
    private static session: any = null;
    private static modelPath: string | null = null;
    private static isLoading: boolean = false;
    private static llamaModule: any = null;

    /**
     * node-llama-cpp 동적 로드
     */
    private static async loadLlamaModule() {
        if (!this.llamaModule) {
            this.llamaModule = await import('node-llama-cpp');
        }
        return this.llamaModule;
    }

    /**
     * GGUF 모델 로드
     */
    static async loadModel(config: LLMConfig): Promise<void> {
        if (LLM.isLoading) {
            throw new Error('모델이 이미 로드 중입니다.');
        }

        if (LLM.model && LLM.modelPath === config.modelPath) {
            logInfo('모델이 이미 로드되어 있습니다.');
            return;
        }

        try {
            LLM.isLoading = true;
            const { modelPath, maxTokens = MODEL_CONTEXT_SIZE_DEF } = config;

            // 파일 존재 확인
            if (!fs.existsSync(modelPath)) {
                throw new Error(`모델 파일을 찾을 수 없습니다: ${modelPath}`);
            }

            const fileSize = fs.statSync(modelPath).size;
            logInfo(`Loading model: ${modelPath}`);
            logInfo(`File size: ${(fileSize / (1024 ** 3)).toFixed(2)} GB`);

            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-load-status', {
                message: 'LLM 모델 로드 중..',
                path: modelPath,
                size: fileSize
            });

            // node-llama-cpp 동적 로드
            logInfo('node-llama-cpp 모듈 로드 중..');
            const { getLlama, LlamaChatSession } = await LLM.loadLlamaModule();

            // llama.cpp 인스턴스 가져오기
            logInfo('llama.cpp 초기화 중..');
            const llama = await getLlama();

            // 모델 로드
            logInfo('GGUF 모델 로드 중..');
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-load-status', {
                message: 'llama.cpp로 GGUF 모델 로드 중..'
            });

            LLM.model = await llama.loadModel({
                modelPath: modelPath,
            });

            // 컨텍스트 생성
            logInfo('모델 컨텍스트 생성 중..');
            LLM.context = await LLM.model.createContext({
                contextSize: maxTokens,
            });

            // 세션 생성
            logInfo('채팅 세션 생성 중..');
            LLM.session = new LlamaChatSession({
                contextSequence: LLM.context.getSequence(),
            });

            LLM.modelPath = modelPath;

            logInfo('모델 로드 완료');
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-load-complete', { path: modelPath });

        } catch (error) {
            logError('모델 로드 실패:', error);
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-load-error', { error: String(error) });
            throw error;
        } finally {
            LLM.isLoading = false;
        }
    }

    /**
     * 문제 해결 (텍스트 생성)
     */
    static async solveProblem(problemText: string): Promise<string> {
        if (!LLM.session) {
            throw new Error('모델이 로드되지 않았습니다. 먼저 모델을 로드하세요.');
        }

        try {
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'solve-status', { message: '문제 풀이 중..' });
            // LLM 문제 풀이 시스템 프롬프트
            const firstPrompt = `You are an expert TOEIC test solver. Analyze the following TOEIC question and select the correct answer.

### Questions
${problemText}

Think carefully and provide your answer:`;

            logInfo('');
            logInfo('[LLM한테 요청한 프롬프트]');
            logInfo(firstPrompt);
            logInfo('');

            const firstResponse = await LLM.session.prompt(firstPrompt, {
                //maxTokens: 512,
                temperature: 0.0,
                topK: 1,
                topP: 0.1,
            });

            logInfo('[LLM 응답]');
            logInfo(firstResponse);
            logInfo('');

            // LLM이 방금 자신이 했던 응답을 JSON으로 변환
            const secondPrompt = `Convert your previous answer to this exact JSON format:
{"question number": "answer letter", ...}

answer letter is (A, B, C, or D). Output only the JSON, nothing else.`;

            logInfo('Step 2: Converting to JSON...');

            const jsonResponse = await LLM.session.prompt(secondPrompt, {
                //maxTokens: 150,
                temperature: 0.0,
                topK: 1,
                topP: 0.1,
            });

            logInfo('');
            logInfo('[LLM JSON 응답]');
            logInfo(jsonResponse);
            logInfo('');

            let answers = {};

            try {

                // JSON 파싱 시도
                answers = JSON.parse(jsonResponse) as { [questioNumber: string]: string };

            } catch (parseError) {
                logError('JSON 파싱 실패:', parseError);
            }

            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'solve-complete', answers);
            return JSON.stringify(answers);

        } catch (error) {
            logError('문제 풀이 실패:', error);
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'solve-error', { error: String(error) });
            throw error;
        }
    }

    /**  모델 언로드  */
    static async unloadModel(): Promise<void> {

        if (LLM.session) {
            LLM.session = null;
        }

        if (LLM.context) {
            await LLM.context.dispose();
            LLM.context = null;
        }

        if (LLM.model) {
            await LLM.model.dispose();
            LLM.model = null;
        }

        LLM.modelPath = null;
        logInfo('모델 언로드됨.');
    }

    /**
     * 현재 로드된 모델 정보
     */
    static getModelInfo(): { path: string | null; isLoaded: boolean } {
        return {
            path: LLM.modelPath,
            isLoaded: LLM.model !== null
        };
    }
}
