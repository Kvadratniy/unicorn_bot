import { Markup } from 'telegraf';
import { getCallbackData } from '../../utils/helpers';
import { replyMessage, replyWithKeyboard } from '../../utils/keyboard';
import { abonementService } from '../../feature/abonement/abonement.service';

/**
 * 🔹 Шаг выбора абонемента ученика (по конкретному преподавателю)
 */
export async function selectAbonementStep(ctx: any, state: any) {
    const data = getCallbackData(ctx);

    // ✅ 1️⃣ Если выбрали абонемент из кнопки
    const match = data?.match(/abonement_(\d+)/);
    if (match) {
        const abonementId = Number(match[1]);
        state.abonementId = abonementId;

        const abonement = await abonementService.getById(abonementId);
        if (abonement) {
            const subject = abonement.Subject?.name ?? 'Без предмета';
            state.subjectId = abonement.Subject?.id;

            await replyMessage(
                ctx,
                `✅ Вы выбрали абонемент:\n📘 *${abonement.template.name}*\n📚 Предмет: *${subject}*`,
                { parse_mode: 'Markdown' },
            );

            return 'next';
        }

        await replyMessage(ctx, '⚠️ Абонемент не найден.');
        return 'leave';
    }

    // ⚠️ 2️⃣ Проверяем наличие ученика и преподавателя в состоянии
    const { studentId, teacherId } = state;
    if (!studentId || !teacherId) {
        await replyMessage(ctx, '⚠️ Не удалось определить ученика или преподавателя.');
        return 'leave';
    }

    // 📚 3️⃣ Загружаем абонементы из сервиса
    const abonements = await abonementService.getByStudentAndTeacher(studentId, teacherId);
    if (!abonements.length) {
        await replyMessage(
            ctx,
            '😕 У этого ученика нет активных абонементов с этим преподавателем.',
        );
        return 'leave';
    }

    // 🧱 4️⃣ Формируем список кнопок
    const buttons = abonements.map((a) => {
        const subjectName = a.Subject?.name || 'Без предмета';
        const statusEmoji = a.status === 'ACTIVE' ? '🟢' : a.status === 'UNPAIND' ? '🟡' : '⚫️';
        const label = `${statusEmoji} ${subjectName} — ${a.template.name}`;
        return [Markup.button.callback(label, `abonement_${a.id}`)];
    });

    // 📨 5️⃣ Отправляем сообщение с клавиатурой
    await replyWithKeyboard(ctx, '📘 Выберите абонемент ученика:', Markup.inlineKeyboard(buttons));
}
