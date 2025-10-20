import { Markup } from 'telegraf';
import { toMSKfromUTC } from './time';

/**
 * Формирует inline-клавиатуру с датами (7 дней подряд)
 * @param offsetDays — сдвиг относительно текущей даты (например, +7 или -7)
 * @param prefix — префикс callback-данных (например, "schedule_day_" или "availability_day_")
 */
export function buildDateButtons(offsetDays = 0, prefix = 'schedule_day_') {
    const nowMsk = toMSKfromUTC(new Date());
    const startMsk = new Date(nowMsk);
    startMsk.setDate(nowMsk.getDate() + offsetDays);

    const days: { label: string; key: string }[] = [];

    for (let i = 0; i < 7; i++) {
        const dateMsk = new Date(startMsk);
        dateMsk.setDate(startMsk.getDate() + i);

        const weekday = dateMsk.toLocaleDateString('ru-RU', { weekday: 'short' });
        const label = `${dateMsk.getDate().toString().padStart(2, '0')}.${(dateMsk.getMonth() + 1)
            .toString()
            .padStart(2, '0')} (${weekday})`;

        const key = dateMsk.toISOString().split('T')[0];
        days.push({ label, key });
    }

    // создаём кнопки (2 в ряд)
    const buttons = [];
    for (let i = 0; i < days.length; i += 2) {
        const row = days
            .slice(i, i + 2)
            .map((d) => Markup.button.callback(d.label, `${prefix}${d.key}`));
        buttons.push(row);
    }

    // навигация по неделям
    buttons.push([
        Markup.button.callback('⬅ Предыдущие', `${prefix}prev_${offsetDays - 7}`),
        Markup.button.callback('➡ Следующие', `${prefix}next_${offsetDays + 7}`),
    ]);

    return Markup.inlineKeyboard(buttons);
}
