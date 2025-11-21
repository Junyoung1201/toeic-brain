import { store } from "../store/store";
import { setLoading } from "../store/ui";

export async function downloadModel({repoId, filename, saveDir}: {
    repoId: string,
    filename: string,
    saveDir: string
}) {

    const { ipcRenderer } = window.require('electron');

    store.dispatch(setLoading({ loading: true, message: '모델 다운로드 중..' }));

    const downloadResult = await ipcRenderer.invoke('start-download', {
        type: 'model',
        repoId,
        filename,
        saveDir
    });

    return downloadResult;
}