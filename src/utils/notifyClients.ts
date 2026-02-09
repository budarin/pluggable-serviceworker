/** Утилита: отправляет сообщение с указанным type всем окнам-клиентам. */
export async function notifyClients(messageType: string): Promise<void> {
    const list = await self.clients.matchAll({ type: 'window' });
    list.forEach((client) => client.postMessage({ type: messageType }));
}
