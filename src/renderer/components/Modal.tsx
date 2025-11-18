import { useAppDispatch, useAppSelector } from '../store/hooks';
import { closeModal } from '../store/ui';
import './Modal.css';

export default function Modal() {
    const dispatch = useAppDispatch();
    const { isModalOpen, modalTitle, modalContent, modalType } = useAppSelector(state => state.ui);

    if (!isModalOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            dispatch(closeModal());
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className={`modal-content modal-${modalType}`}>
                <button className="modal-close" onClick={() => dispatch(closeModal())}>
                    <span>✕</span>
                </button>
                {modalTitle && <div className="modal-title">{modalTitle}</div>}
                <div className="modal-body">
                    {modalContent}
                </div>
            </div>
        </div>
    );
}
