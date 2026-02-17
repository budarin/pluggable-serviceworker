/**
 * Утилита: отправляет сообщение с указанным type всем окнам-клиентам.
 * @param messageType — тип сообщения (поле `type` в объекте, уходящем в postMessage).
 * @param data — опциональный объект с данными; его поля добавляются в то же сообщение (без мутации).
 * @param includeUncontrolled — если true, включает в рассылку неконтролируемые вкладки (includeUncontrolled: true). По умолчанию false.
 */
export async function notifyClients(
    messageType: string,
    data?: Record<string, unknown>,
    includeUncontrolled: boolean = false,
): Promise<void> {
    const list = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled,
    });
    const payload =
        data === undefined
            ? { type: messageType }
            : { type: messageType, ...data };

    list.forEach((client) => client.postMessage(payload));
}
