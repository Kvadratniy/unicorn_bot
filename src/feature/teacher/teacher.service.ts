import prisma from '../../core/prisma';
import { toMSKfromUTC } from '../../utils/time';

export const teacherService = {
    /**
     * Добавить новое доступное время преподавателя
     */
    async createAvailability(teacherId: number, startDate: Date, endDate: Date) {
        return prisma.teacherAvailability.create({
            data: { teacherId, startDate, endDate },
        });
    },

    async getTeacherAvailabilityForDay(teacherId: number, dateIso: string) {
        const startUtc = new Date(`${dateIso}T00:00:00Z`);
        const endUtc = new Date(`${dateIso}T23:59:59Z`);

        const intervals = await prisma.teacherAvailability.findMany({
            where: { teacherId, startDate: { gte: startUtc, lte: endUtc } },
            orderBy: { startDate: 'asc' },
        });

        // Преобразуем интервалы в читаемые строки
        return intervals.map((i) => {
            const startMsk = toMSKfromUTC(i.startDate);
            const endMsk = toMSKfromUTC(i.endDate);
            const start = startMsk.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const end = endMsk.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            });
            return `🕓 ${start}–${end}`;
        });
    },

    /**
     * Получить все доступные интервалы для преподавателя за конкретный день
     */
    async getAvailabilityForDay(teacherId: number, dayStart: Date, dayEnd: Date) {
        return prisma.teacherAvailability.findMany({
            where: {
                teacherId,
                startDate: { gte: dayStart },
                endDate: { lte: dayEnd },
            },
            orderBy: { startDate: 'asc' },
        });
    },

    /**
     * Удалить конкретный интервал доступности (по id)
     */
    async deleteAvailability(id: number, teacherId: number) {
        return prisma.teacherAvailability.deleteMany({
            where: { id, teacherId },
        });
    },

    async getFreeDaysBySubject(subjectId: number): Promise<string[]> {
        // 1️⃣ Преподаватели, ведущие предмет
        const teachers = await prisma.teacher.findMany({
            where: { subjects: { some: { id: subjectId } } },
            select: {
                id: true,
                name: true,
                TeacherAvailability: { select: { startDate: true, endDate: true } },
                schedules: { select: { startDate: true, endDate: true } },
            },
        });

        const freeDays = new Set<string>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const teacher of teachers) {
            const busy = teacher.schedules.map((s) => ({
                start: s.startDate.getTime(),
                end: s.endDate.getTime(),
            }));

            for (const avail of teacher.TeacherAvailability) {
                let day = new Date(avail.startDate);

                while (day <= avail.endDate) {
                    // Пропускаем прошлое
                    if (day < today) {
                        day.setDate(day.getDate() + 1);
                        continue;
                    }

                    const startOfDay = new Date(day);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(day);
                    endOfDay.setHours(23, 59, 59, 999);

                    const availabilityStart = Math.max(
                        avail.startDate.getTime(),
                        startOfDay.getTime(),
                    );
                    const availabilityEnd = Math.min(avail.endDate.getTime(), endOfDay.getTime());

                    let freeRanges = [{ start: availabilityStart, end: availabilityEnd }];

                    for (const b of busy) {
                        freeRanges = freeRanges.flatMap((range) => {
                            if (b.end <= range.start || b.start >= range.end) return [range]; // не пересекаются
                            const newRanges = [];
                            if (b.start > range.start)
                                newRanges.push({ start: range.start, end: b.start });
                            if (b.end < range.end) newRanges.push({ start: b.end, end: range.end });
                            return newRanges;
                        });
                    }

                    // хотя бы 5 минут свободного времени
                    const hasFree = freeRanges.some((r) => r.end - r.start > 5 * 60 * 1000);
                    if (hasFree) freeDays.add(startOfDay.toISOString().split('T')[0]);

                    day.setDate(day.getDate() + 1);
                }
            }
        }

        return Array.from(freeDays).sort();
    },
};
