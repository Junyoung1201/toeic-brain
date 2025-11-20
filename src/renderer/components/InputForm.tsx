import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import './InputForm.css';
import { setMode, openModal, ModalType, setLoading, setLoadingProgress, setAnswerList } from '../store/ui';

export default function InputForm() {
    const { mode, answerList } = useAppSelector((state) => state.ui);
    const { modelPath, modelName, modelFilename } = useAppSelector((state) => state.settings);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [questionText, setQuestionText] = useState('');
    const dispatch = useAppDispatch();

    useEffect(() => {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');

        // 모델 다운로드 진행률
        const handleDownloadProgress = (event: any, data: any) => {
            const { downloaded, total, progress } = data;
            dispatch(setLoadingProgress({
                message: `모델 다운로드 중... ${progress}%`,
                progress: parseFloat(progress)
            }));
        };

        // 모델 다운로드 완료
        const handleDownloadComplete = (event: any, data: any) => {
            console.log('Model download complete:', data);
            dispatch(setLoadingProgress({
                message: '모델 다운로드 완료!',
                progress: 100
            }));
        };

        // 모델 다운로드 에러
        const handleDownloadError = (event: any, data: any) => {
            console.error('Download error:', data);
            dispatch(setLoading(false));
            dispatch(openModal({
                title: '다운로드 오류',
                content: <p>{data.error || '모델 다운로드 중 오류가 발생했습니다.'}</p>,
                type: ModalType.ERROR
            }));
        };

        // 모델 로드 상태
        const handleModelLoadStatus = (event: any, data: any) => {
            console.log('Model load status:', data);
            dispatch(setLoadingProgress({
                message: data.message || '모델 로딩 중...',
                progress: 30
            }));
        };

        // 모델 로드 완료
        const handleModelLoadComplete = (event: any, data: any) => {
            console.log('Model load complete:', data);
            dispatch(setLoadingProgress({
                message: '모델 로드 완료!',
                progress: 50
            }));
        };

        // 모델 로드 에러
        const handleModelLoadError = (event: any, data: any) => {
            console.error('Model load error:', data);
            dispatch(setLoading(false));
            dispatch(openModal({
                title: '모델 로드 오류',
                content: <p>{data.error || '모델 로드 중 오류가 발생했습니다.'}</p>,
                type: ModalType.ERROR
            }));
        };

        // 문제 풀이 상태
        const handleSolveStatus = (event: any, data: any) => {
            console.log('Solve status:', data);
            dispatch(setLoadingProgress({
                message: data.message || '문제 풀이 중...',
                progress: 70
            }));
        };

        // 문제 풀이 완료
        const handleSolveComplete = (event: any, data: any) => {

            console.log('[handleSolveComplete] 문제 풀이 완료:', data);

            dispatch(setLoading(false));
            dispatch(setAnswerList(data));

            // 문제 입력란 초기화
            setQuestionText('');
        };

        // 문제 풀이 에러
        const handleSolveError = (event: any, data: any) => {
            console.error('Solve error:', data);
            dispatch(setLoading(false));
            dispatch(openModal({
                title: '문제 풀이 오류',
                content: <p>{data.error || '문제 풀이 중 오류가 발생했습니다.'}</p>,
                type: ModalType.ERROR
            }));
        };

        ipcRenderer.on('model-download-progress', handleDownloadProgress);
        ipcRenderer.on('model-download-complete', handleDownloadComplete);
        ipcRenderer.on('model-download-error', handleDownloadError);
        ipcRenderer.on('model-load-status', handleModelLoadStatus);
        ipcRenderer.on('model-load-complete', handleModelLoadComplete);
        ipcRenderer.on('model-load-error', handleModelLoadError);
        ipcRenderer.on('solve-status', handleSolveStatus);
        ipcRenderer.on('solve-complete', handleSolveComplete);
        ipcRenderer.on('solve-error', handleSolveError);

        return () => {
            ipcRenderer.removeListener('model-download-progress', handleDownloadProgress);
            ipcRenderer.removeListener('model-download-complete', handleDownloadComplete);
            ipcRenderer.removeListener('model-download-error', handleDownloadError);
            ipcRenderer.removeListener('model-load-status', handleModelLoadStatus);
            ipcRenderer.removeListener('model-load-complete', handleModelLoadComplete);
            ipcRenderer.removeListener('model-load-error', handleModelLoadError);
            ipcRenderer.removeListener('solve-status', handleSolveStatus);
            ipcRenderer.removeListener('solve-complete', handleSolveComplete);
            ipcRenderer.removeListener('solve-error', handleSolveError);
        };
    }, [dispatch]);

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
        dispatch(setLoadingProgress({ message: '모델 확인 중...', progress: 0 }));

        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');

            // 1. 현재 모델 상태 확인
            const modelInfo = await ipcRenderer.invoke('get-model-info');
            console.log('Current model info:', modelInfo);

            // 2. 모델이 로드되어 있으면 바로 문제 풀이
            if (modelInfo.isLoaded) {
                console.log('모델 이미 로드되어 있음.');
                dispatch(setLoadingProgress({ message: '문제 풀이 중...', progress: 50 }));

                const { success, answer, error } = await ipcRenderer.invoke('solve-problem', {
                    questionText
                });

                if (success) {

                    try {
                        const answerJson = JSON.parse(answer);

                        console.log("문제 풀이 완료:", answerJson);
                        dispatch(setAnswerList(answerJson));
                    } catch (err) {
                        dispatch(setAnswerList({}));
                        console.error("LLM이 올바르지 않은 응답을 보냈습니다.");
                        console.error(err);
                    } finally {
                        setQuestionText('');
                        dispatch(setLoading(false));
                    }
                } else {
                    throw new Error(error || '문제 풀이 실패');
                }
                return;
            }

            // 3. 모델이 없으면 다운로드 필요 확인
            if (!modelName) {
                throw new Error('모델이 설정되지 않았습니다. 설정에서 모델을 선택해주세요.');
            }

            // 4. 모델 경로 확인 및 다운로드
            const fs = window.require('fs');
            const path = window.require('path');

            // GGUF 파일명 (설정에서 가져오거나 기본값 사용)
            const ggufFilename = modelFilename || 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf';
            const fullModelPath = path.join(modelPath, ggufFilename);

            console.log('Checking model path:', fullModelPath);

            // 파일 존재 확인
            let modelExists = false;

            try {
                fs.accessSync(fullModelPath);
                modelExists = true;
                console.log('모델 파일 있음');
            } catch {
                console.log('모델 파일 없음');
            }

            // 5. 모델이 없으면 다운로드
            if (!modelExists) {
                dispatch(setLoadingProgress({ message: '모델 다운로드 시작...', progress: 10 }));

                const downloadResult = await ipcRenderer.invoke('start-download', {
                    type: 'model',
                    repoId: modelName,
                    filename: ggufFilename,
                    saveDir: modelPath
                });

                if (!downloadResult.success) {
                    throw new Error(downloadResult.error || '모델 다운로드 실패');
                }
            }

            // 6. 모델 로드
            dispatch(setLoadingProgress({ message: '모델 로딩 중...', progress: 40 }));
            console.log('Loading model from:', fullModelPath);

            const loadResult = await ipcRenderer.invoke('load-model', {
                modelPath: fullModelPath
            });

            if (!loadResult.success) {
                throw new Error(loadResult.error || '모델 로드 실패');
            }

            // 7. 문제 풀이
            dispatch(setLoadingProgress({ message: '문제 풀이 중..', progress: 70 }));

            const solveResult = await ipcRenderer.invoke('solve-problem', {
                questionText
            });

            if (solveResult.success) {
                dispatch(setLoading(false));

                const answerJson = JSON.parse(solveResult.answer);

                console.log("문제 풀이 완료:", solveResult.answer);

                dispatch(setAnswerList(answerJson));
                setQuestionText('');
            } else {
                throw new Error(solveResult.error || '문제 풀이 실패');
            }

        } catch (error) {
            console.error('Submit failed:', error);
            dispatch(setLoading(false));
            dispatch(openModal({
                title: '오류',
                content: <p>{String(error)}</p>,
                type: ModalType.ERROR
            }));
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