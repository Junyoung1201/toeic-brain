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

export interface Answer {
    [questionNumber: string]: string
}

interface UiState {
    mode: 'lc' | 'rc';
    answerList: Answer;
    isModalOpen: boolean;
    modalTitle: ReactNode | null;
    modalContent: ReactNode | null;
    modalType: ModalType;
    isLoading: boolean;
    loadingMessage: string;
}

const ui = createSlice({
    name: 'ui',
    initialState: {
        mode: 'rc',
        answerList: {},
        isModalOpen: false,
        modalTitle: null,
        modalContent: null,
        modalType: ModalType.INFO,
        isLoading: false,
        loadingMessage: '준비 중...',
    } as UiState,
    reducers: {
        setAnswerList(state, action: PayloadAction<Answer>) {
            state.answerList = action.payload;
        },
        clearAnswerList(state) {
            state.answerList = {};
        },
        setMode(state, action: PayloadAction<'lc' | 'rc'>) {
            state.mode = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean | {loading: boolean, message?: string}>) {
            if (typeof action.payload === 'boolean') {
                state.isLoading = action.payload;
                if (!action.payload) {
                    state.loadingMessage = '준비 중...';
                }
            } else {
                state.isLoading = action.payload.loading;
                if (action.payload.message !== undefined) {
                    state.loadingMessage = action.payload.message;
                }
                if (!action.payload.loading) {
                    state.loadingMessage = '준비 중...';
                }
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
        },
        toggleLoadingScreen(state) {
            state.isLoading = !state.isLoading;
        }
    }
})


export const { setAnswerList, clearAnswerList, setMode, openModal, closeModal, setLoading, toggleLoadingScreen } = ui.actions;
export default ui.reducer;