import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
    modelPath: string;
    modelName: string;
    pytorchUrl: string;
    llamaCppUrl: string;
}

const initialState: SettingsState = {
    modelPath: '',
    modelName: '',
    pytorchUrl: '',
    llamaCppUrl: '',
};

const settings = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setSettings(state, action: PayloadAction<Partial<SettingsState>>) {
            return { ...state, ...action.payload };
        },
        setPytorchUrl(state, action: PayloadAction<string>) {
            state.pytorchUrl = action.payload;
        }
    }
});

export const { setSettings, setPytorchUrl } = settings.actions;
export default settings.reducer;
