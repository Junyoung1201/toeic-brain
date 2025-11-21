import { BrowserWindow } from 'electron';
import { pipeline, AutomaticSpeechRecognitionPipeline } from '@xenova/transformers';
import { logInfo, logError } from '../utils/logger';
import { WindowManager } from './windows';
import wavefileModule from 'wavefile';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

const { WaveFile } = wavefileModule as any;

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
    private static transcriber: AutomaticSpeechRecognitionPipeline | null = null;
    private static modelName: string | null = null;
    private static isLoading: boolean = false;

    /**
     * 오디오 파일을 Float32Array로 변환
     */
    private static async readAudioFile(audioPath: string): Promise<Float32Array> {
        const ext = path.extname(audioPath).toLowerCase();
        let wavPath = audioPath;
        let tempFile = false;

        // MP3나 다른 포맷이면 WAV로 변환
        if (ext !== '.wav') {
            logInfo(`${ext}(을)를 WAV로 변환 중..`);
            wavPath = audioPath.replace(ext, '_temp.wav');
            tempFile = true;

            try {
                // FFmpeg를 사용하여 WAV로 변환 (16kHz mono)
                const ffmpeg = ffmpegPath.path;
                execSync(`"${ffmpeg}" -i "${audioPath}" -ar 16000 -ac 1 -f wav "${wavPath}" -y`, {
                    stdio: 'pipe'
                });
            } catch (error) {
                logError('FFmpeg 변환 실패:', error);
                throw new Error(`오디오 파일 변환 실패: ${error}`);
            }
        }

        try {
            // WAV 파일 읽기
            const buffer = fs.readFileSync(wavPath);
            const wav = new WaveFile(buffer);

            // 16-bit PCM을 Float32Array로 변환
            wav.toBitDepth('32f');
            const rawSamples = wav.getSamples(false, Float32Array);
            const samples = rawSamples instanceof Float32Array ? rawSamples : new Float32Array(rawSamples as ArrayLike<number>);

            // 임시 파일 삭제
            if (tempFile && fs.existsSync(wavPath)) {
                fs.unlinkSync(wavPath);
            }

            return samples;
        } catch (error) {
            // 임시 파일 정리
            if (tempFile && fs.existsSync(wavPath)) {
                fs.unlinkSync(wavPath);
            }
            throw error;
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
        if (Whisper.transcriber && Whisper.modelName === modelName) {
            logInfo('Whisper 모델이 이미 로드되어 있습니다.');
            return;
        }

        try {
            Whisper.isLoading = true;

            logInfo(`Whisper 모델 로드 중: ${modelName} (장치: ${device}, 양자화: ${quantized})`);

            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-status', {
                message: 'Whisper 모델 로드 중..',
                modelName
            });

            // 파일별 다운로드 진행률 추적
            const fileProgress: { [key: string]: { loaded: number; total: number } } = {};
            let lastReportedPercentage = 0;

            // transformers.js의 pipeline을 사용하여 모델 로드
            Whisper.transcriber = await pipeline(
                'automatic-speech-recognition',
                modelName,
                {
                    quantized,

                    // 진행 상황 콜백
                    progress_callback: (progress: any) => {
                        if (progress.status === 'progress' && progress.file) {
                            // 각 파일의 진행률 업데이트
                            fileProgress[progress.file] = {
                                loaded: progress.loaded,
                                total: progress.total
                            };

                            // 전체 진행률 계산
                            let totalLoaded = 0;
                            let totalSize = 0;
                            Object.values(fileProgress).forEach(file => {
                                totalLoaded += file.loaded;
                                totalSize += file.total;
                            });

                            const percentage = totalSize > 0
                                ? Math.round((totalLoaded / totalSize) * 100)
                                : 0;

                            // 진행률이 변경되었을 때만 업데이트 (너무 자주 업데이트 방지)
                            if (Math.abs(percentage - lastReportedPercentage) >= 1) {
                                lastReportedPercentage = percentage;
                                logInfo(`Whisper 모델 다운로드 중: ${percentage}%`);
                                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-progress', {
                                    percentage,
                                    loaded: totalLoaded,
                                    total: totalSize
                                });
                            }
                        }
                    }
                }
            );

            Whisper.modelName = modelName;
            logInfo('Whisper 모델 로드 완료');

            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-complete', {
                modelName
            });

        } catch (error) {
            logError('Whisper 모델 로드 실패:', error);
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-load-error', {
                error: String(error)
            });
            throw error;
        } finally {
            Whisper.isLoading = false;
        }
    }

    /**
     * 오디오 파일을 텍스트로 변환
     */
    static async transcribe(
        audioPath: string,
        options: TranscribeOptions = {}
    ): Promise<TranscriptResult> {
        if (!Whisper.transcriber) {
            throw new Error('Whisper 모델이 로드되지 않았습니다.');
        }

        try {
            logInfo(`오디오 변환 중: ${audioPath}`);

            const {
                language = 'english',
                task = 'transcribe',
                chunk_length_s = 30,
                stride_length_s = 5,
                return_timestamps = false
            } = options;

            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-transcribe-status', {
                message: '오디오 변환 중..',
                audioPath
            });

            // 오디오 파일을 Float32Array로 읽기
            logInfo('오디오 파일 읽는 중');
            const audioData = await Whisper.readAudioFile(audioPath);

            logInfo('오디오 인식 시작');
            
            // 음성 인식 실행 (오디오 데이터를 직접 전달)
            const result = await Whisper.transcriber(audioData, {
                language,
                task,
                chunk_length_s,
                stride_length_s,
                return_timestamps
            });

            logInfo('오디오 인식 완료');

            const transcriptResult = Array.isArray(result) ? result[0] : result;
            const resultText = transcriptResult.text;

            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-transcribe-complete', {
                text: resultText
            });

            return transcriptResult as TranscriptResult;

        } catch (error) {
            
            logError('오디오 변환 실패:', error);
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'whisper-transcribe-error', {
                error: String(error)
            });
            throw error;
        }
    }

    /**
     * 모델 언로드
     */
    static unloadModel(): void {
        if (Whisper.transcriber) {
            logInfo('Whisper 모델 언로드 중');
            Whisper.transcriber = null;
            Whisper.modelName = null;
        }
    }

    /**
     * 모델 정보 조회
     */
    static getModelInfo(): { loaded: boolean; modelName: string | null } {
        return {
            loaded: Whisper.transcriber !== null,
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
