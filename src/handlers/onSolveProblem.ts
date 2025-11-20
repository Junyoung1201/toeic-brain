import { LLM } from "../modules/llm";
import { logError, logInfo } from "../utils/logger";

export async function onSolveProblem(event: any, args: any) {
    const { questionText } = args;

    try {
        logInfo("문제 푸는 중..");

        const answer = await LLM.solveProblem(questionText);
        return { success: true, answer };

    } catch (error) {
        logError("문제 풀이 실패:", error);
        return { success: false, error: String(error) };
    }
}