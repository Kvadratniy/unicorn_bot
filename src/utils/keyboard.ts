// Тип для хранения в session
type LastKb = { chatId: number; messageId: number };

/** Снять клавиатуру у предыдущего сообщения, если оно сохранено в сессии */
export async function clearLastKeyboard(ctx: any) {
    const last: LastKb | undefined = ctx.session?.__lastKb;
    if (!last) return;

    try {
        await ctx.telegram.editMessageReplyMarkup(
            last.chatId,
            last.messageId,
            undefined,
            undefined, // снять inline-клавиатуру
        );
    } catch (e) {
        // бывает, что сообщение уже удалено/отредактировано — игнорим
    } finally {
        if (ctx.session) ctx.session.__lastKb = undefined;
    }
}

/** Запомнить отправленное сообщение как "последнее с клавиатурой" */
export function rememberKeyboard(ctx: any, sentMessage: any) {
    try {
        if (!ctx.session) return;
        ctx.session.__lastKb = {
            chatId: sentMessage.chat.id,
            messageId: sentMessage.message_id,
        };
    } catch {
        /* ignore */
    }
}

export function rememberMessage(ctx: any, msg: any) {
    if (!ctx.session) return;
    if (!ctx.session.__sentMessages) ctx.session.__sentMessages = [];
    ctx.session.__sentMessages.push({
        chatId: msg.chat.id,
        messageId: msg.message_id,
    });
}

export async function deleteSavedMessages(ctx: any) {
    if (!ctx.session?.__sentMessages?.length) return;

    for (const m of ctx.session.__sentMessages) {
        try {
            await ctx.telegram.deleteMessage(m.chatId, m.messageId);
        } catch {
            /* игнорируем ошибки (например, если сообщение уже удалено) */
        }
    }

    ctx.session.__sentMessages = [];
}

export async function replyMessage(ctx: any, text: string, opts: any = {}) {
    const msg = await ctx.reply(text, { ...opts });
    rememberMessage(ctx, msg);
    return msg;
}

/** Удобный helper: сперва снять старую клаву, потом отправить новое сообщение с клавой и запомнить его */
export async function replyWithKeyboard(ctx: any, text: string, keyboard: any, opts: any = {}) {
    await clearLastKeyboard(ctx);
    const msg = await ctx.reply(text, { ...opts, ...keyboard });
    rememberKeyboard(ctx, msg);
    rememberMessage(ctx, msg);
    return msg;
}

/** Аналогично для editMessageText (если вы хотите переиспользовать одно и то же сообщение) */
export async function editWithKeyboard(ctx: any, text: string, keyboard: any, opts: any = {}) {
    // editMessageText всегда редактирует ТЕКУЩЕЕ сообщение (то, по которому кликнули).
    // На всякий случай снимем сохранённую предыдущую клавиатуру (если она из другого сообщения).
    await clearLastKeyboard(ctx);
    await ctx.editMessageText(text, { ...opts, ...keyboard }).catch(() => {});
    // и запомнить текущее сообщение как последнее:
    try {
        const m = ctx.callbackQuery?.message;
        if (m) rememberKeyboard(ctx, m);
    } catch {}
}
