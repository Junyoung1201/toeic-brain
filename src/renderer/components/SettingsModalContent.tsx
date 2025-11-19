import React from 'react';
import './SettingsModalContent.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSettings } from '../store/settings';

export default function SettingsModalContent() {
    const dispatch = useAppDispatch();
    const { modelPath, modelName, pytorchUrl, llamaCppUrl } = useAppSelector(state => state.settings);

    const handleSave = () => {
        console.log('Settings Saved:', { modelPath, modelName, pytorchUrl, llamaCppUrl });
        // TODO: Save to store or electron-store
    };

    const handleChange = (key: string, value: string) => {
        dispatch(setSettings({ [key]: value }));
    };

    return (
        <div className="settings-modal-content">
            <div className="settings-group">
                <label htmlFor="modelPath">모델 다운로드 경로</label>
                <input
                    type="text"
                    id="modelPath"
                    value={modelPath}
                    onChange={(e) => handleChange('modelPath', e.target.value)}
                    placeholder="C:/Models/..."
                />
            </div>

            <div className="settings-group">
                <label htmlFor="modelName">문제풀이 모델 이름</label>
                <input
                    type="text"
                    id="modelName"
                    value={modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder="Model Name"
                />
            </div>

            <div className="settings-group">
                <label htmlFor="pytorchUrl">pyTorch 다운로드 URL</label>
                <input
                    type="text"
                    id="pytorchUrl"
                    value={pytorchUrl}
                    onChange={(e) => handleChange('pytorchUrl', e.target.value)}
                    placeholder="https://download.pytorch.org/..."
                />
            </div>

            <div className="settings-group">
                <label htmlFor="llamaCppUrl">llama-cpp-python Wheel URL (Optional)</label>
                <input
                    type="text"
                    id="llamaCppUrl"
                    value={llamaCppUrl}
                    onChange={(e) => handleChange('llamaCppUrl', e.target.value)}
                    placeholder="https://abetlen.github.io/llama-cpp-python/whl/cu124"
                />
            </div>

            <div className="settings-actions">
                <button className="save-button" onClick={handleSave}>저장</button>
            </div>
        </div>
    );
}
