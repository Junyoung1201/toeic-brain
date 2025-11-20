import { LLM } from "../modules/llm";
import { logError, logInfo } from "../utils/logger";

export async function onLoadModel(event: any, args: any) {
    const { modelPath } = args;

    try {

        logInfo('Loading model:', modelPath);
        await LLM.loadModel({ modelPath });
        return { success: true };

    } catch (error) {

        logError('Failed to load model:', error);
        return { success: false, error: String(error) };
        
    }
}