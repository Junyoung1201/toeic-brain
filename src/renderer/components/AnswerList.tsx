import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import './AnswerList.css';
import { useAppSelector } from '../store/hooks';

export default function AnswerList() {
    const answerList = useAppSelector((state) => state.ui.answerList);
    const [width, setWidth] = useState(250);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        console.log('answerList:', answerList);
    }, [answerList]);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = window.innerWidth - mouseMoveEvent.clientX;
                if (newWidth >= 150 && newWidth <= 800) {
                    setWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div className='answer-field' style={{ width: width }}>
            <div
                className={`resizer ${isResizing ? 'resizing' : ''}`}
                onMouseDown={startResizing}
            />
            <div className='title'>답안</div>

            <div id='answerListHolder'>
                <div id='answerList'>
                    {
                        answerList &&
                        Object.entries(answerList).map(([key, value], index) => (
                            <div key={`answer_item_${index}`}>
                                <span>{key}번</span>
                                <span>{value}</span>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}