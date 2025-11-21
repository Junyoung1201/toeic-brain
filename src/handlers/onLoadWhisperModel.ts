import { Whisper } from "../modules/whisper";
import { logError, logInfo } from "../utils/logger";

interface LoadWhisperModelParams {
    modelName?: string;
    device?: 'cpu' | 'cuda' | 'auto';
    computeType?: 'int8' | 'float16' | 'float32' | 'auto';
}

export async function onLoadWhisperModel(
    event: any,
    params: LoadWhisperModelParams = {}
) {
    try {
        const { modelName, device, computeType } = params;

        logInfo('Loading Whisper model:', modelName || 'default (large-v3)');
        
        await Whisper.loadModel({
            modelName,
            device,
            computeType
        });

        return { success: true };

    } catch (error) {
        logError('Failed to load Whisper model:', error);
        return { success: false, error: String(error) };
    }
}
