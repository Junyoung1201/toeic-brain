import { AppDispatch } from "../store/hooks";
import { setSettings } from "../store/settings";
import { ModalType, openModal } from "../store/ui";

export async function initializeEnvironment(dispatch: AppDispatch) {
    try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');

        // 기본 모델 경로 설정
        const defaultModelsPath = await ipcRenderer.invoke('get-default-models-path');
        dispatch(setSettings({ modelPath: defaultModelsPath }));

        // CUDA 및 GPU 확인
        const { available, gpuName, vram } = await ipcRenderer.invoke('check-cuda');

        if (!available) {
            dispatch(openModal({
                title: '오류',
                content: `CUDA를 사용할 수 없습니다.NVIDIA GPU가 없거나 드라이버가 설치되지 않았을 수 있습니다.`,
                type: ModalType.ERROR
            }));
        }

        else if (gpuName) {

            // VRAM에 따른 모델 자동 설정
            // VRAM 단위는 MB임. 8GB ~= 8192MB
            let recommendedModel = '';
            const vramGb = vram / 1024;

            let recommendedFilename = '';

            if (vramGb >= 16) {
                recommendedModel = 'bartowski/Qwen2.5-14B-Instruct-GGUF';
                recommendedFilename = 'Qwen2.5-14B-Instruct-Q4_K_M.gguf';
            } 
            
            else if (vramGb >= 10) {
                recommendedModel = 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF';
                recommendedFilename = 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf';
            } else {
                // 8GB 이하 (또는 그 근처)
                recommendedModel = 'bartowski/Phi-3.5-mini-instruct-GGUF';
                recommendedFilename = 'Phi-3.5-mini-instruct-Q4_K_M.gguf';
            }

            const newSettings: any = {};

            // 추천 모델로 자동 설정
            if (recommendedModel) {
                newSettings.modelName = recommendedModel;
            }

            // 추천 모델 경로 자동 설정
            if (recommendedFilename) {
                newSettings.modelFilename = recommendedFilename;
            }

            if (Object.keys(newSettings).length > 0) {
                dispatch(setSettings(newSettings));
                console.log(`Detected GPU: ${gpuName}, VRAM: ${vram}MB. Auto-settings:`, newSettings);
            }
        }
    } catch (error) {
        console.error('Failed to initialize environment:', error);
    }
};