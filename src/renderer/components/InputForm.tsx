import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import './InputForm.css';
import { setMode, openModal, ModalType, setLoading, setLoadingProgress } from '../store/ui';

export default function InputForm() {
    const { mode } = useAppSelector((state) => state.ui);
    const { modelPath, modelName, pytorchUrl, llamaCppUrl } = useAppSelector((state) => state.settings);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [questionText, setQuestionText] = useState('');
    const dispatch = useAppDispatch();

    useEffect(() => {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');
        
        const handlePythonMessage = (event: any, message: any) => {
            console.log('Python message:', message);
            
            if (message.type === 'progress') {
                const { task, current, total } = message.data;
                const progress = total > 0 ? (current / total) * 100 : 0;
                
                if (task === 'download_pytorch') {
                    dispatch(setLoadingProgress({ 
                        message: 'PyTorch 다운로드 중...', 
                        progress 
                    }));
                } else if (task === 'download_model') {
                    dispatch(setLoadingProgress({ 
                        message: '모델 다운로드 중...', 
                        progress 
                    }));
                }
            } else if (message.type === 'status') {
                dispatch(setLoadingProgress({ message: message.data, progress: 0 }));
            } else if (message.type === 'log') {
                // 설치 로그는 콘솔에만 출력
                console.log('[Install]:', message.data);
            } else if (message.type === 'complete') {
                const { task, path, answer } = message.data;
                if (task === 'install_pytorch') {
                    dispatch(setLoadingProgress({ message: 'PyTorch 설치 완료! 모델 준비 중...', progress: 100 }));
                    // PyTorch 설치 후 모델 다운로드 시작
                    if (modelName && modelPath) {
                        console.log('Starting model download after PyTorch installation');
                        ipcRenderer.invoke('start-download', {
                            type: 'model',
                            repoId: modelName,
                            saveDir: modelPath
                        });
                    }
                } else if (task === 'download_model') {
                    dispatch(setLoadingProgress({ message: '모델 다운로드 완료!', progress: 100 }));
                    // 모델 로드 시작
                    if (path) {
                        ipcRenderer.send('load-and-solve', { modelPath: path, problem: questionText, llamaCppUrl });
                    }
                } else if (task === 'load_model') {
                    dispatch(setLoadingProgress({ message: '모델 로드 완료! 문제 풀이 중...', progress: 50 }));
                    // 모델 로드 완료 알림
                    ipcRenderer.send('model-loaded');
                } else if (task === 'solve_problem') {
                    dispatch(setLoading(false));
                    // 답안을 answerList에 추가
                    if (answer) {
                        dispatch(openModal({
                            title: '문제 풀이 완료',
                            content: <p>정답: {answer}</p>,
                            type: ModalType.INFO
                        }));
                    }
                }
            } else if (message.type === 'error') {
                dispatch(setLoading(false));
                dispatch(openModal({
                    title: '오류',
                    content: <p>{message.data}</p>,
                    type: ModalType.ERROR
                }));
            }
        };
        
        ipcRenderer.on('python-message', handlePythonMessage);
        
        return () => {
            ipcRenderer.removeListener('python-message', handlePythonMessage);
        };
    }, [dispatch, questionText, llamaCppUrl]);

    function onAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            setAudioFile(e.target.files[0]);
            dispatch(setMode('lc'));
        } else {
            setAudioFile(null);
            dispatch(setMode('rc'));
        }
    }

    function onInputFileClick(e: React.MouseEvent<HTMLDivElement>) {

        const element = document.querySelector("#inputForm #selectFile") as HTMLInputElement;

        if (element) {
            element.click();
        }
    }

    const handleSubmit = async () => {
        if (!questionText.trim()) {
            dispatch(openModal({
                title: '오류',
                content: <p>문제를 입력해주세요.</p>,
                type: ModalType.ERROR
            }));
            return;
        }

        dispatch(setLoading(true));

        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            
            // 1. PyTorch 다운로드 및 설치 요청
            if (pytorchUrl) {
                console.log('Requesting PyTorch download:', pytorchUrl);
                await ipcRenderer.invoke('start-download', {
                    type: 'pytorch',
                    url: pytorchUrl
                });
                // PyTorch가 설치 중이면 complete 이벤트에서 모델 다운로드가 시작됨
                // 여기서는 반환하고 이벤트 핸들러가 나머지를 처리
                return;
            }

            // 2. PyTorch URL이 없으면 바로 모델 다운로드 시작
            if (modelName && modelPath) {
                console.log('Requesting model download:', modelName, 'to', modelPath);
                await ipcRenderer.invoke('start-download', {
                    type: 'model',
                    repoId: modelName,
                    saveDir: modelPath
                });
                // Python에서 complete 메시지를 받을 때까지 대기는 이미 이벤트 리스너가 처리
            }

            // 3. 모델이 다운로드되어 있는지 확인하고 문제 풀이 시작
            // 다운로드가 완료되면 이벤트 리스너에서 자동으로 모델 로드 및 문제 풀이 시작
            
        } catch (error) {
            console.error('Download failed:', error);
            dispatch(openModal({
                title: '오류',
                content: <p>다운로드 중 오류가 발생했습니다.</p>,
                type: ModalType.ERROR
            }));
            dispatch(setLoading(false));
        }
    };

    return (
        <div id='inputForm' className='input-form'>
            <div className='top'>
                <div className='mode'>{mode.toUpperCase()}</div>

                <div className='input-file' onClick={onInputFileClick}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <span>
                        {audioFile ? audioFile.name : 'LC 음원 파일을 선택하세요.'}
                    </span>
                    <input id='selectFile' type='file' accept='.mp3, .wav, .m4a' hidden onChange={onAudioFileChange} />
                </div>
            </div>

            <div className='input-field'>
                <textarea 
                    placeholder='여기에 문제 입력'
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                >
                </textarea>

                <button onClick={handleSubmit}>제출</button>
            </div>
        </div>
    )
}