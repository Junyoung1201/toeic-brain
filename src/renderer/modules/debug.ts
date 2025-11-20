import { AppDispatch } from "../store/hooks";
import { ModalType, openModal, setLoading, toggleLoadingScreen } from "../store/ui";

export function handleDebugKeyDown(e: KeyboardEvent, dispatch: AppDispatch) {
    if (e.key === 'F1') {
        e.preventDefault();
        dispatch(openModal({
            title: 'Info 모달',
            content: `기본 정보 모달입니다.`,
            type: ModalType.INFO
        }));
    }
}