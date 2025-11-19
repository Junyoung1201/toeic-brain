import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ReactNode } from "react";

export enum ModalType {
    INFO = 'info',
    ERROR = 'error',
    WARN = 'warn',
    SETTINGS = 'settings'
}

interface ModalPayload {
    title?: ReactNode;
    content: ReactNode;
    type?: ModalType;
}

interface UiState {
    mode: 'lc' | 'rc';
    answerList: string[];
    isModalOpen: boolean;
    modalTitle: ReactNode | null;
    modalContent: ReactNode | null;
    modalType: ModalType;
    isLoading: boolean;
    loadingMessage: string;
    loadingProgress: number;
}

const ui = createSlice({
    name: 'ui',
    initialState: {
        mode: 'rc',
        answerList: [
            'A','C','B','D','A','B','C','D','A','B','A','C','B','D','A','B','C','D','A','B'
        ],
        isModalOpen: false,
        modalTitle: null,
        modalContent: null,
        modalType: ModalType.INFO,
        isLoading: false,
        loadingMessage: '준비 중...',
        loadingProgress: 0,
    } as UiState,
    reducers: {
        setAnswerList(state, action: PayloadAction<string[]>) {
            state.answerList = action.payload;
        },
        setMode(state, action: PayloadAction<'lc' | 'rc'>) {
            state.mode = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
            if (!action.payload) {
                state.loadingMessage = '준비 중...';
                state.loadingProgress = 0;
            }
        },
        setLoadingProgress(state, action: PayloadAction<{message?: string, progress?: number}>) {
            if (action.payload.message !== undefined) {
                state.loadingMessage = action.payload.message;
            }
            if (action.payload.progress !== undefined) {
                state.loadingProgress = action.payload.progress;
            }
        },
        openModal(state, action: PayloadAction<ModalPayload>) {
            const { title, content, type = ModalType.INFO } = action.payload;
            
            // title만 있고 content가 없으면 에러
            if (title && !content) {
                throw new Error('Modal content is required when title is provided');
            }
            
            state.isModalOpen = true;
            state.modalTitle = title || null;
            state.modalContent = content;
            state.modalType = type;
        },
        closeModal(state) {
            state.isModalOpen = false;
            state.modalTitle = null;
            state.modalContent = null;
            state.modalType = ModalType.INFO;
        }
    }
})

export const { setAnswerList, setMode, openModal, closeModal, setLoading, setLoadingProgress } = ui.actions;
export default ui.reducer;