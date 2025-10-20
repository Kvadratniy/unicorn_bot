import { subtractBusyIntervals } from './helpers';

export function mergeFreeSlots(availabilities: any, schedules: any) {
    const freeByTeacher: Record<number, { name: string; slots: { start: string; end: string }[] }> =
        {};
    const globalBusy = schedules.map((s: any) => ({ start: s.startDate, end: s.endDate }));

    for (const slot of availabilities) {
        const teacherId = slot.teacherId;
        const teacherName = slot.teacher.name;

        const freeSlots = subtractBusyIntervals(
            { start: slot.startDate, end: slot.endDate },
            globalBusy,
        );

        if (!freeByTeacher[teacherId]) {
            freeByTeacher[teacherId] = { name: teacherName, slots: [] };
        }

        freeByTeacher[teacherId].slots.push(...freeSlots);
    }

    // 🔁 Объединяем интервалы
    const result: Record<number, string> = {};
    for (const teacherId in freeByTeacher) {
        const { name, slots } = freeByTeacher[teacherId];
        const sorted = slots.sort((a, b) => a.start.localeCompare(b.start));
        const merged: { start: string; end: string }[] = [];

        for (const s of sorted) {
            if (!merged.length) merged.push(s);
            else {
                const last = merged[merged.length - 1];
                if (s.start <= last.end) {
                    if (s.end > last.end) last.end = s.end;
                } else {
                    merged.push(s);
                }
            }
        }

        const freeFormatted = merged.map((f) => `${f.start}–${f.end}`).join(', ') || '—';
        result[teacherId] = `👨‍🏫 ${name}: ${freeFormatted}`;
    }

    return result;
}
