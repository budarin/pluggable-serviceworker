/**
 * Утилита: отправляет сообщение с указанным type всем окнам-клиентам.
 * @param messageType — тип сообщения (поле `type` в объекте, уходящем в postMessage).
 * @param data — опциональный объект с данными; его поля добавляются в то же сообщение (без мутации).
 */
export async function notifyClients(
    messageType: string,
    data?: Record<string, unknown>,
): Promise<void> {
    const list = await self.clients.matchAll({ type: 'window' });
    const payload =
        data === undefined
            ? { type: messageType }
            : { type: messageType, ...data };

    list.forEach((client) => client.postMessage(payload));
}
