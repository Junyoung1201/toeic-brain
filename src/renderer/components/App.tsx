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
import { setSettings } from '../store/settings';
import {initApp} from '../modules/app-init';
import { handleDebugKeyDown } from '../modules/debug';

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

        initApp(dispatch);

        window.addEventListener('keydown', e => handleDebugKeyDown(e, dispatch));

        return () => {
            window.removeEventListener('keydown', e => handleDebugKeyDown(e, dispatch));
        }
        
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