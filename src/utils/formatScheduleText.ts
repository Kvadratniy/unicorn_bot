import { toMSKfromUTC } from './time';

export function formatScheduleText(schedules: any[]) {
    if (!schedules.length) return '🎓 *Занятий нет*\n\n';

    let text = '🎓 *Занятия:*\n\n';
    for (const s of schedules) {
        const timeFrom = toMSKfromUTC(s.startDate).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const timeTo = toMSKfromUTC(s.endDate).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const students = s.students.length
            ? s.students.map((st: any) => `${st.firstName} ${st.lastName ?? ''}`.trim()).join(', ')
            : '—';

        text +=
            `• ${timeFrom} — ${timeTo} ${s.subject.name}\n` +
            `   Преподаватель: *${s.teacher.name}*\n` +
            `   Ученик: *${students}*\n` +
            `   Подробнее: /details${s.id}\n\n`;
    }

    return text;
}
