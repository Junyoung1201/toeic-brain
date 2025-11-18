import { useEffect } from 'react';
import './App.css';
import InputForm from './InputForm';
import AnswerList from './AnswerList';
import Modal from './Modal';
import { useAppDispatch } from '../store/hooks';
import { openModal, ModalType } from '../store/ui';

export default function App() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                dispatch(openModal({
                    title: 'Info 모달',
                    content: <p>기본 정보 모달입니다.</p>,
                    type: ModalType.INFO
                }));
            } else if (e.key === 'F2') {
                e.preventDefault();
                dispatch(openModal({
                    title: 'Error 모달',
                    content: <p>오류가 발생했습니다!</p>,
                    type: ModalType.ERROR
                }));
            } else if (e.key === 'F3') {
                e.preventDefault();
                dispatch(openModal({
                    title: 'Warning 모달',
                    content: <p>경고 메시지입니다.</p>,
                    type: ModalType.WARN
                }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch]);

    return (
        <div id='app'>
            <InputForm />
            <AnswerList />
            <Modal />
        </div>
    );
};