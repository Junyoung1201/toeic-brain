import { useEffect } from 'react';
import './App.css';
import InputForm from './InputForm';
import AnswerList from './AnswerList';
import Modal from './Modal';
import SettingsButton from './SettingsButton';
import SettingsModalContent from './SettingsModalContent';
import LoadingOverlay from './LoadingOverlay';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openModal, ModalType, setLoading } from '../store/ui';
import { setPytorchUrl, setSettings } from '../store/settings';

export default function App() {
    const dispatch = useAppDispatch();
    const { isLoading } = useAppSelector(state => state.ui);

    const handleSettingsClick = () => {
        dispatch(openModal({
            title: '설정',
            content: <SettingsModalContent />,
            type: ModalType.SETTINGS
        }));
    };

    useEffect(() => {
        const initializeEnvironment = async () => {
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
                        content: <p>CUDA를 사용할 수 없습니다. NVIDIA GPU가 없거나 드라이버가 설치되지 않았을 수 있습니다.</p>,
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
                    } else if (vramGb >= 10) {
                        recommendedModel = 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF';
                        recommendedFilename = 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf';
                    } else {
                        // 8GB 이하 (또는 그 근처)
                        recommendedModel = 'bartowski/Phi-3.5-mini-instruct-GGUF';
                        recommendedFilename = 'Phi-3.5-mini-instruct-Q4_K_M.gguf';
                    }

                    // GPU 이름에서 시리즈 확인 (예: RTX 3060 -> 30)
                    const match = gpuName.match(/(?:GTX|RTX)\s*(\d{2})\d{2}/i);
                    let pytorchUrl = '';

                    if (match && match[1]) {
                        const series = parseInt(match[1], 10);
                        
                        if (series >= 50) {
                            pytorchUrl = 'https://download.pytorch.org/whl/nightly/cu128';
                        } else if (series >= 10) {
                            pytorchUrl = 'https://download.pytorch.org/whl/cu121';
                        }
                    }

                    const newSettings: any = {};

                    if (recommendedModel) {
                        newSettings.modelName = recommendedModel;
                    }

                    if (recommendedFilename) newSettings.modelFilename = recommendedFilename;
                    if (pytorchUrl) newSettings.pytorchUrl = pytorchUrl;

                    if (Object.keys(newSettings).length > 0) {
                        dispatch(setSettings(newSettings));
                        console.log(`Detected GPU: ${gpuName} (Series: ${match?.[1]}, VRAM: ${vram}MB). Auto-settings:`, newSettings);
                    }
                }
            } catch (error) {
                console.error('Failed to initialize environment:', error);
            }
        };

        initializeEnvironment();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                dispatch(openModal({
                    title: 'Info 모달',
                    content: <p>기본 정보 모달입니다.</p>,
                    type: ModalType.INFO
                }));
            } 
            
            else if (e.key === 'F2') {
                e.preventDefault();
                dispatch(openModal({
                    title: 'Error 모달',
                    content: <p>오류가 발생했습니다!</p>,
                    type: ModalType.ERROR
                }));
            } 
            
            else if (e.key === 'F3') {
                e.preventDefault();
                dispatch(openModal({
                    title: 'Warning 모달',
                    content: <p>경고 메시지입니다.</p>,
                    type: ModalType.WARN
                }));
            } 
            
            else if (e.key === 'F4') {
                e.preventDefault();
                dispatch(setLoading(!isLoading));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch, isLoading]);

    return (
        <div id='app'>
            <SettingsButton onClick={handleSettingsClick} />
            <InputForm />
            <AnswerList />
            <Modal />
            <LoadingOverlay />
        </div>
    );
};