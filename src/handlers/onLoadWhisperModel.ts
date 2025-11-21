import { Whisper } from "../modules/whisper";
import { logError, logInfo } from "../utils/logger";

interface LoadWhisperModelParams {
    modelName?: string;
    device?: 'cpu' | 'gpu';
    quantized?: boolean;
}

export async function onLoadWhisperModel(
    event: any,
    params: LoadWhisperModelParams = {}
) {
    try {
        const { modelName, device, quantized } = params;

        logInfo('Loading Whisper model:', modelName || 'default (Xenova/whisper-large-v3)');
        
        await Whisper.loadModel({
            modelName,
            device,
            quantized
        });

        return { success: true };

    } catch (error) {
        logError('Failed to load Whisper model:', error);
        return { success: false, error: String(error) };
    }
}
