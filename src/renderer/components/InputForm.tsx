import React, { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import './InputForm.css';

export default function InputForm() {
    const { mode } = useAppSelector((state) => state.ui);
    const [audioFile, setAudioFile] = useState<File | null>(null);

    function onAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            setAudioFile(e.target.files[0]);
        }
    }

    function onInputFileClick(e: React.MouseEvent<HTMLDivElement>) {

        const element = document.querySelector("#inputForm #selectFile") as HTMLInputElement;

        if (element) {
            element.click();
        }
    }

    return (
        <div id='inputForm' className='input-form'>
            <div className='top'>
                <div className='mode'>{mode.toUpperCase()}</div>

                <div className='input-file' onClick={onInputFileClick}>
                    {
                        mode === 'lc' &&
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13"></path>
                                <circle cx="6" cy="18" r="3"></circle>
                                <circle cx="18" cy="16" r="3"></circle>
                            </svg>
                            <span>
                                {audioFile ? audioFile.name : 'LC 음원 파일을 선택하세요.'}
                            </span>
                            <input id='selectFile' type='file' accept='.mp3, .wav, .m4a' hidden onChange={onAudioFileChange} />
                        </>
                    }

                    {
                        mode === 'rc' &&
                        <div className='not-support'>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>RC 모드에서는 음원 파일이 필요하지 않습니다.</span>
                        </div>
                    }
                </div>
            </div>

            <div className='input-field'>
                <textarea placeholder='여기에 문제 입력'>

                </textarea>

                <button>제출</button>
            </div>
        </div>
    )
}