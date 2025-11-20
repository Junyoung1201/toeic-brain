import { app } from "electron";
import path from "path";

/**  모델 파일 다운로드 경로 기본값  */
export const MODEL_DOWNLOAD_PATH_DEF = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
export const MODEL_CONTEXT_SIZE_DEF = 4096;