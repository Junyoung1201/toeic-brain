import { parentPort, workerData } from 'worker_threads';
import { pipeline, AutomaticSpeechRecognitionPipeline, env } from '@xenova/transformers';
import wavefileModule from 'wavefile';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

const { WaveFile } = wavefileModule as any;

// ONNX Runtime 설정
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.wasm.numThreads = 8; // CPU 멀티스레드 최대 활용

// GPU 가속 환경변수 설정 시도
process.env.ONNXRUNTIME_EXECUTION_PROVIDERS = 'CUDA,DML,CPU';

parentPort?.postMessage({
    type: 'log',
    data: { message: 'Whisper Worker 초기화 - GPU 가속 시도 중 (CUDA/DirectML)' }
});

interface WorkerMessage {
    type: 'load-model' | 'transcribe' | 'unload';
    data?: any;
}

interface LoadModelData {
    modelName: string;
    quantized: boolean;
}

interface TranscribeData {
    audioPath: string;
    language: string;
    task: 'transcribe' | 'translate';
    chunk_length_s: number;
    stride_length_s: number;
    return_timestamps: boolean;
}

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let currentModelName: string | null = null;

/**
 * 오디오 파일을 Float32Array로 변환
 */
async function readAudioFile(audioPath: string): Promise<Float32Array> {
    const ext = path.extname(audioPath).toLowerCase();
    let wavPath = audioPath;
    let tempFile = false;

    // MP3나 다른 포맷이면 WAV로 변환
    if (ext !== '.wav') {
        wavPath = audioPath.replace(ext, '_temp.wav');
        tempFile = true;

        try {
            // FFmpeg를 사용하여 WAV로 변환 (16kHz mono)
            const ffmpeg = ffmpegPath.path;
            execSync(`"${ffmpeg}" -i "${audioPath}" -ar 16000 -ac 1 -f wav "${wavPath}" -y`, {
                stdio: 'pipe'
            });
        } catch (error) {
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
 * 모델 로드
 */
async function loadModel(data: LoadModelData) {
    const { modelName, quantized } = data;

    // 이미 같은 모델이 로드되어 있으면 스킵
    if (transcriber && currentModelName === modelName) {
        parentPort?.postMessage({
            type: 'load-complete',
            data: { modelName }
        });
        return;
    }

    try {
        parentPort?.postMessage({
            type: 'load-status',
            data: { message: 'Whisper 모델 로드 중..', modelName }
        });

        // 파일별 다운로드 진행률 추적
        const fileProgress: { [key: string]: { loaded: number; total: number } } = {};
        let lastReportedPercentage = 0;

        // Pipeline 옵션 설정
        const pipelineOptions: any = {
            quantized,
            device: 'auto', // auto로 설정하면 가능한 경우 GPU 사용
            progress_callback: (progress: any) => {
                if (progress.status === 'progress' && progress.file) {
                    fileProgress[progress.file] = {
                        loaded: progress.loaded,
                        total: progress.total
                    };

                    let totalLoaded = 0;
                    let totalSize = 0;
                    Object.values(fileProgress).forEach(file => {
                        totalLoaded += file.loaded;
                        totalSize += file.total;
                    });

                    const percentage = totalSize > 0
                        ? Math.round((totalLoaded / totalSize) * 100)
                        : 0;

                    if (Math.abs(percentage - lastReportedPercentage) >= 1) {
                        lastReportedPercentage = percentage;
                        parentPort?.postMessage({
                            type: 'load-progress',
                            data: { percentage, loaded: totalLoaded, total: totalSize }
                        });
                    }
                }
            }
        };

        parentPort?.postMessage({
            type: 'log',
            data: { message: `모델 로드 옵션: device=auto, quantized=${quantized}` }
        });

        transcriber = await pipeline(
            'automatic-speech-recognition',
            modelName,
            pipelineOptions
        );

        parentPort?.postMessage({
            type: 'log',
            data: { message: '모델 로드 완료 - 추론 준비됨' }
        });

        currentModelName = modelName;

        parentPort?.postMessage({
            type: 'load-complete',
            data: { modelName }
        });

    } catch (error) {
        parentPort?.postMessage({
            type: 'load-error',
            data: { error: String(error) }
        });
    }
}

/**
 * 음성 인식 실행
 */
async function transcribe(data: TranscribeData) {
    if (!transcriber) {
        parentPort?.postMessage({
            type: 'transcribe-error',
            data: { error: 'Whisper 모델이 로드되지 않았습니다.' }
        });
        return;
    }

    try {
        const {
            audioPath,
            language,
            task,
            chunk_length_s,
            stride_length_s,
            return_timestamps
        } = data;

        parentPort?.postMessage({
            type: 'transcribe-status',
            data: { message: '오디오 파일 읽는 중..', audioPath }
        });

        // 오디오 파일을 Float32Array로 읽기
        const audioData = await readAudioFile(audioPath);

        parentPort?.postMessage({
            type: 'transcribe-status',
            data: { message: '오디오 인식 중..', audioPath }
        });

        // 음성 인식 실행
        const result = await transcriber(audioData, {
            language,
            task,
            chunk_length_s,
            stride_length_s,
            return_timestamps
        });

        const transcriptResult = Array.isArray(result) ? result[0] : result;

        parentPort?.postMessage({
            type: 'transcribe-complete',
            data: { 
                text: transcriptResult.text,
                chunks: transcriptResult.chunks
            }
        });

    } catch (error) {
        parentPort?.postMessage({
            type: 'transcribe-error',
            data: { error: String(error) }
        });
    }
}

/**
 * 모델 언로드
 */
function unloadModel() {
    transcriber = null;
    currentModelName = null;
    parentPort?.postMessage({
        type: 'unload-complete',
        data: {}
    });
}

// Worker 메시지 리스너
parentPort?.on('message', async (message: WorkerMessage) => {
    try {
        switch (message.type) {
            case 'load-model':
                await loadModel(message.data);
                break;
            case 'transcribe':
                await transcribe(message.data);
                break;
            case 'unload':
                unloadModel();
                break;
        }
    } catch (error) {
        parentPort?.postMessage({
            type: 'error',
            data: { error: String(error) }
        });
    }
});

// Worker 준비 완료 메시지
parentPort?.postMessage({
    type: 'ready',
    data: {}
});
