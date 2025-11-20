import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
    modelPath: string;
    modelName: string;
    modelFilename: string;
}

const initialState: SettingsState = {
    modelPath: '',
    modelName: '',
    modelFilename: '',
};

const settings = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setSettings(state, action: PayloadAction<Partial<SettingsState>>) {
            return { ...state, ...action.payload };
        }
    }
});

export const { setSettings } = settings.actions;
export default settings.reducer;
