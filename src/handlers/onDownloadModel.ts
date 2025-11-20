import { downloadModel } from "../modules/model-download";
import { logError } from "../utils/logger";

interface I_DownloadModelParams {
    type: string;
    repoId: string;
    saveDir: string;
    filename: string;
}

export async function onDownloadModel(event: any, { type, repoId, saveDir, filename }: I_DownloadModelParams) {
    if (type === 'model') {
        try {
            const modelPath = await downloadModel(repoId, filename, saveDir);
            return { success: true, path: modelPath };
        } catch (error) {
            logError('Download failed:', error);
            return { success: false, error: String(error) };
        }
    }

    return { success: false, error: 'Invalid download type' };
}