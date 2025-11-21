import { Whisper } from "../modules/whisper";
import { logError, logInfo } from "../utils/logger";

interface TranscribeAudioParams {
    audioPath: string;
    language?: string;
    task?: 'transcribe' | 'translate';
    chunk_length_s?: number;
    stride_length_s?: number;
    return_timestamps?: boolean;
}

export async function onTranscribeAudio(
    event: any,
    params: TranscribeAudioParams
) {
    try {
        const { audioPath, ...options } = params;

        if (!audioPath) {
            throw new Error('Audio path is required');
        }

        logInfo('Transcribing audio:', audioPath);
        
        const result = await Whisper.transcribe(audioPath, options);

        return { 
            success: true, 
            text: result.text,
            chunks: result.chunks
        };

    } catch (error) {
        logError('Failed to transcribe audio:', error);
        return { success: false, error: String(error) };
    }
}
