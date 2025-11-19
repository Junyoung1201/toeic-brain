import { configureStore } from '@reduxjs/toolkit';
import ui from './ui';
import settings from './settings';

export const store = configureStore({
    reducer: {
        ui,
        settings
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;

