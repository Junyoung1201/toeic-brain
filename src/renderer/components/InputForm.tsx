import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import './InputForm.css';
import { setMode, openModal, ModalType, setLoading, setAnswerList } from '../store/ui';
import { ipcRenderer } from '../constants';
import { downloadModel } from '../modules/model-download';

export default function InputForm() {
    const { mode, answerList } = useAppSelector((state) => state.ui);
    const { modelPath, modelName, modelFilename } = useAppSelector((state) => state.settings);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [questionText, setQuestionText] = useState('');
    const dispatch = useAppDispatch();

    useEffect(() => {

        // 모델 다운로드 진행률
        const handleDownloadProgress = (event: any, data: any) => {
            const { progress } = data;
            dispatch(setLoading({
                loading: true,
                message: `모델 다운로드 중.. ${progress}%`
            }));
        };

        // 모델 다운로드 완료
        const handleDownloadComplete = (event: any, data: any) => {
            console.log('Model download complete:', data);
            dispatch(setLoading({
                loading: true,
                message: '모델 다운로드 완료'
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
            dispatch(setLoading({
                loading: true,
                message: data.message || '모델 로딩 중..'
            }));
        };

        // 모델 로드 완료
        const handleModelLoadComplete = (event: any, data: any) => {
            console.log('Model load complete:', data);
            dispatch(setLoading({
                loading: true,
                message: '모델 로드 완료!'
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
            dispatch(setLoading({
                loading: true,
                message: data.message || '문제 풀이 중..'
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
            console.error('문제 풀이 실패:', data);

            dispatch(setLoading(false));
            dispatch(openModal({
                title: '문제 풀이 오류',
                content: <p>{data.error || '문제 풀이에 실패했습니다.'}</p>,
                type: ModalType.ERROR
            }));
        };

        // Whisper 모델 로드 진행률
        const handleWhisperLoadProgress = (event: any, data: any) => {
            console.log('Whisper load progress:', data);
            dispatch(setLoading({
                loading: true,
                message: `Whisper 모델 다운로드 중.. ${data.percentage}%`
            }));
        };

        // Whisper 모델 로드 완료
        const handleWhisperLoadComplete = (event: any, data: any) => {
            console.log('Whisper model loaded:', data);
            dispatch(setLoading({
                loading: true,
                message: 'Whisper 모델 로드 완료'
            }));
        };

        // Whisper 모델 로드 에러
        const handleWhisperLoadError = (event: any, data: any) => {
            console.error('Whisper load error:', data);
            dispatch(setLoading(false));
            dispatch(openModal({
                title: 'Whisper 로드 오류',
                content: <p>{data.error || 'Whisper 모델 로드 중 오류가 발생했습니다.'}</p>,
                type: ModalType.ERROR
            }));
        };

        // Whisper 변환 상태
        const handleWhisperTranscribeStatus = (event: any, data: any) => {
            console.log('Whisper transcribing:', data);
            dispatch(setLoading({
                loading: true,
                message: '음성 변환 중..'
            }));
        };

        // Whisper 변환 완료
        const handleWhisperTranscribeComplete = (event: any, data: any) => {
            console.log('Whisper transcription complete:', data);
            dispatch(setLoading({
                loading: true,
                message: '음성 변환 완료!'
            }));
        };

        // Whisper 변환 에러
        const handleWhisperTranscribeError = (event: any, data: any) => {
            console.error('Whisper transcribe error:', data);
            dispatch(setLoading(false));
            dispatch(openModal({
                title: '음성 변환 오류',
                content: <p>{data.error || '음성 변환 중 오류가 발생했습니다.'}</p>,
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
        ipcRenderer.on('whisper-load-progress', handleWhisperLoadProgress);
        ipcRenderer.on('whisper-load-complete', handleWhisperLoadComplete);
        ipcRenderer.on('whisper-load-error', handleWhisperLoadError);
        ipcRenderer.on('whisper-transcribe-status', handleWhisperTranscribeStatus);
        ipcRenderer.on('whisper-transcribe-complete', handleWhisperTranscribeComplete);
        ipcRenderer.on('whisper-transcribe-error', handleWhisperTranscribeError);

        return () => {
            ipcRenderer.removeAllListeners('model-download-progress');
            ipcRenderer.removeAllListeners('model-download-complete');
            ipcRenderer.removeAllListeners('model-download-error');
            ipcRenderer.removeAllListeners('model-load-status');
            ipcRenderer.removeAllListeners('model-load-complete');
            ipcRenderer.removeAllListeners('model-load-error');
            ipcRenderer.removeAllListeners('solve-status');
            ipcRenderer.removeAllListeners('solve-complete');
            ipcRenderer.removeAllListeners('solve-error');
            ipcRenderer.removeAllListeners('whisper-load-progress');
            ipcRenderer.removeAllListeners('whisper-load-complete');
            ipcRenderer.removeAllListeners('whisper-load-error');
            ipcRenderer.removeAllListeners('whisper-transcribe-status');
            ipcRenderer.removeAllListeners('whisper-transcribe-complete');
            ipcRenderer.removeAllListeners('whisper-transcribe-error');
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

    const handleLCMode = async () => {

        // @ts-ignore
        const { ipcRenderer } = window.require('electron');

        try {
            // 1. LLM 모델 확인 및 로드
            const modelInfo = await ipcRenderer.invoke('get-model-info');
            console.log('현재 LLM 모델:', modelInfo);

            if (!modelInfo.isLoaded) {
                dispatch(setLoading({ loading: true, message: 'LLM 모델 확인 중..' }));

                // 모델 다운로드/로드 로직
                if (!modelName) {
                    throw new Error('모델이 설정되지 않았습니다. 설정에서 모델을 선택해주세요.');
                }

                const fs = window.require('fs');
                const path = window.require('path');

                const ggufFilename = modelFilename || 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf';
                const fullModelPath = path.join(modelPath, ggufFilename);

                console.log('Checking LLM model path:', fullModelPath);

                let modelExists = false;
                try {
                    fs.accessSync(fullModelPath);
                    modelExists = true;
                    console.log('LLM 모델 파일 있음');
                } catch {
                    console.log('LLM 모델 파일 없음');
                }

                if (!modelExists) {
                    const { success, error } = await downloadModel({
                        repoId: modelName,
                        filename: ggufFilename,
                        saveDir: modelPath
                    });

                    if (!success) {
                        throw new Error(error || 'LLM 모델 다운로드 실패');
                    }
                }

                // LLM 모델 로드
                dispatch(setLoading({ loading: true, message: 'LLM 모델 로딩 중..' }));
                const loadResult = await ipcRenderer.invoke('load-model', {
                    modelPath: fullModelPath
                });

                if (!loadResult.success) {
                    throw new Error(loadResult.error || 'LLM 모델 로드 실패');
                }
            }

            // 2. Whisper 모델 확인 및 로드
            const whisperInfo = await ipcRenderer.invoke('get-whisper-model-info');
            console.log('whisper 모델 로딩 중:', whisperInfo);

            if (!whisperInfo.loaded) {
                dispatch(setLoading({ loading: true, message: 'Whisper 모델 로딩 중..' }));
                
                const loadResult = await ipcRenderer.invoke('load-whisper-model', {
                    modelName: 'Xenova/whisper-large-v3',
                    device: 'cpu',
                    quantized: true
                });

                if (!loadResult.success) {
                    throw new Error(loadResult.error || 'Whisper 모델 로드 실패');
                }
            }

            // 3. 오디오 파일 변환
            dispatch(setLoading({ loading: true, message: '음성 변환 중..' }));

            const transcribeResult = await ipcRenderer.invoke('transcribe-audio', {
                //@ts-ignore
                audioPath: audioFile!.path,
                language: 'english',
                task: 'transcribe',
                return_timestamps: false
            });

            if (!transcribeResult.success) {
                throw new Error(transcribeResult.error || '음성 변환 실패');
            }

            console.log('LC 음성 변환됨:', transcribeResult.text);

            // 4. 변환된 텍스트로 문제 풀이
            const transcribedText = transcribeResult.text || '';
            const combinedText = questionText ? `${questionText}\n\n[Script Text]\n${transcribedText}` : transcribedText;
            
            await solveProblem(ipcRenderer, combinedText);

            // 5. 오디오 파일 초기화
            setAudioFile(null);

            const fileInput = document.querySelector("#inputForm #selectFile") as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }

        } catch (error) {
            console.error('LC 문제풀이 실패:', error);
            throw error;
        }
    };

    const solveProblem = async (ipcRenderer: any, questionText: string) => {
        dispatch(setLoading({ loading: true, message: '문제 풀이 중..' }));

        // 백엔드에 문제 풀이 요청하기
        const { success, answer, error } = await ipcRenderer.invoke('solve-problem', {
            questionText
        });

        if (success) {
            try {

                // 답안 JSON 문자열을 실제 object로 변환
                const answerJson = JSON.parse(answer);
                console.log("문제 풀이 완료:", answerJson);

                // 답안 출력
                dispatch(setAnswerList(answerJson));

            } catch (err) {

                // JSON 파싱이 실패한 경우
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
    };

    const handleSubmit = async () => {

        // LC, RC 모두 문제 텍스트는 있어야함
        if(!questionText.trim()) {
            dispatch(openModal({
                title: '오류',
                content: <p>문제를 입력해주세요.</p>,
                type: ModalType.ERROR
            }));
            return;
        }

        // LC 모드일 때 오디오 파일 확인
        if (mode === 'lc' && !audioFile) {
            dispatch(openModal({
                title: '오류',
                content: <p>LC 모드에서는 음원 파일을 선택해주세요.</p>,
                type: ModalType.ERROR
            }));
            return;
        }

        dispatch(setLoading({ loading: true, message: '모델 확인 중..' }));

        try {

            // LC 모드: Whisper로 오디오 변환 -> 문제 풀이
            if (mode === 'lc' && audioFile) {
                await handleLCMode();
                return;
            }

            // 1. 현재 모델 확인
            const modelInfo = await ipcRenderer.invoke('get-model-info');
            console.log('현재 모델:', modelInfo);

            // 2. 모델이 로드되어 있으면 바로 문제 풀이
            if (modelInfo.isLoaded) {
                console.log('모델 이미 로드되어 있음.');
                await solveProblem(ipcRenderer, questionText);
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

            // 모델이 없으면 다운로드
            if (!modelExists) {
                const { success, error } = await downloadModel({
                    repoId: modelName,
                    filename: ggufFilename,
                    saveDir: modelPath
                });

                if (!success) {
                    throw new Error(error || '모델 다운로드 실패');
                } else {
                    console.log("모델 다운로드 완료");
                }
            }

            // 모델 로드
            dispatch(setLoading({ loading: true, message: '모델 로딩 중..' }));
            console.log('모델 경로:', fullModelPath);

            const loadResult = await ipcRenderer.invoke('load-model', {
                modelPath: fullModelPath
            });

            if (!loadResult.success) {
                throw new Error(loadResult.error || '모델 로드 실패');
            }

            // 문제 풀이 시작
            await solveProblem(ipcRenderer, questionText);

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