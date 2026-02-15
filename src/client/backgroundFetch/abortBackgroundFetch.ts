import { getBackgroundFetchRegistration } from './getBackgroundFetchRegistration.js';

/**
 * Отменяет фоновую загрузку по id.
 *
 * @param registration - регистрация Service Worker
 * @param id - идентификатор загрузки
 * @returns true, если загрузка была найдена и отменена, false иначе
 */
export async function abortBackgroundFetch(
    registration: ServiceWorkerRegistration,
    id: string
): Promise<boolean> {
    const bgReg = await getBackgroundFetchRegistration(registration, id);
    if (!bgReg) {
        return false;
    }
    await bgReg.abort();
    return true;
}
