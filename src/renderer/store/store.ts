import { configureStore } from '@reduxjs/toolkit';
import ui from './ui';

export const store = configureStore({
    reducer: {
        ui
    },
});

export type RootState = ReturnType<typeof store.getState>;

