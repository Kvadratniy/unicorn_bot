import { Context } from 'telegraf';

/**
 * 🧹 Удаляет только inline-кнопки, оставляя текст сообщения
 */
export async function removeInlineKeyboard(ctx: any) {
    const msg = ctx.callbackQuery?.message || ctx.message;
    if (!msg) return;

    try {
        await ctx.telegram.editMessageReplyMarkup(
            msg.chat.id,
            msg.message_id,
            undefined,
            undefined,
        );
    } catch (err: any) {
        const message = err?.description || err?.message || '';
        if (
            !message.includes('message is not modified') &&
            !message.includes('message to edit not found') &&
            !message.includes('message to delete not found')
        ) {
            console.error('Ошибка removeInlineKeyboard:', message);
        }
    }
}
/**
 * ❌ Безопасно удаляет сообщение (игнорирует ошибки Telegram API)
 */
export async function deleteMessageSafe(ctx: Context) {
    try {
        if ('deleteMessage' in ctx) {
            await ctx.answerCbQuery();
            await ctx.deleteMessage().catch(() => {});
        }
    } catch (err) {
        console.warn('⚠️ Не удалось удалить сообщение:', err);
    }
}

export function getCallbackData(ctx: any): string {
    return ctx.callbackQuery && 'data' in ctx.callbackQuery ? (ctx.callbackQuery as any).data : '';
}

/**
 * Вычесть занятые интервалы из одного свободного промежутка
 * @param freeSlot { start: Date; end: Date } — свободное время (UTC)
 * @param busySlots { start: Date; end: Date }[] — занятые интервалы (UTC)
 * @returns массив свободных промежутков [{ start: "HH:MM", end: "HH:MM" }]
 */
export function subtractBusyIntervals(
    freeSlot: { start: Date; end: Date },
    busySlots: { start: Date; end: Date }[],
): { start: string; end: string }[] {
    const freeStart = freeSlot.start.getTime();
    const freeEnd = freeSlot.end.getTime();

    // Переводим занятые интервалы в миллисекунды
    const busy = busySlots
        .map((b) => ({
            start: b.start.getTime(),
            end: b.end.getTime(),
        }))
        .filter((b) => b.end > freeStart && b.start < freeEnd)
        .sort((a, b) => a.start - b.start);

    const result: { start: string; end: string }[] = [];
    let cursor = freeStart;

    for (const b of busy) {
        if (b.start > cursor) {
            result.push({
                start: hhmm(new Date(cursor)),
                end: hhmm(new Date(Math.min(b.start, freeEnd))),
            });
        }
        cursor = Math.max(cursor, b.end);
        if (cursor >= freeEnd) break;
    }

    if (cursor < freeEnd) {
        result.push({
            start: hhmm(new Date(cursor)),
            end: hhmm(new Date(freeEnd)),
        });
    }

    return result;
}

function hhmm(d: Date) {
    return d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
    });
}

export function getMessageText(ctx: any): string | undefined {
    if ('message' in ctx && ctx.message && 'text' in ctx.message) {
        return (ctx.message as any).text?.trim();
    }
    return undefined;
}
