import { scheduleService } from '../schedule.service';
import { toMSKfromUTC, toUTCfromMSK } from '../../../utils/time';

/**
 * Возвращает текст расписания на указанный день
 * @param dateIso ISO-строка даты (например, "2025-10-20")
 * @returns строка с отформатированным расписанием
 */
export async function getScheduleTextByDate(dateIso: string): Promise<string> {
    // 📅 Преобразуем ISO-день в границы UTC-даты
    const [year, month, day] = dateIso.split('-').map(Number);
    const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const nextLocalDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

    const date = toUTCfromMSK(localDate);
    const nextDay = toUTCfromMSK(nextLocalDay);

    // 🔹 Получаем занятия за день
    const schedules = await scheduleService.getSchedulesByDateRange(date, nextDay);

    const currentDay = localDate.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    // 🧾 Формируем текст
    let text = `📅 *${currentDay}*\n\n`;

    if (!schedules.length) {
        text += '🎓 Занятий нет.';
    } else {
        for (const schedule of schedules) {
            const timeFrom = toMSKfromUTC(schedule.startDate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const timeTo = toMSKfromUTC(schedule.endDate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            });

            const students = schedule.students.length
                ? schedule.students
                      .map((s) => `${s.firstName} ${s.lastName ?? ''}`.trim())
                      .join(', ')
                : '—';

            text += `🕒 ${timeFrom}–${timeTo}\n👨‍🏫 ${schedule.teacher.name}\n👨‍🎓 ${students}\n\n`;
        }
    }

    return text.trim();
}
