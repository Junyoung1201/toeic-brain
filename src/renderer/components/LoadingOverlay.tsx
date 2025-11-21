import React from 'react';
import './LoadingOverlay.css';
import { useAppSelector } from '../store/hooks';

export default function LoadingOverlay() {
    const { isLoading, loadingMessage } = useAppSelector(state => state.ui);

    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="spinner"></div>
                <p>{loadingMessage}</p>
                <p className="sub-text">잠시만 기다려주세요.</p>
            </div>
        </div>
    );
}
