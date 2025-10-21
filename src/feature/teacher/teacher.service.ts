import prisma from '../../core/prisma';
import { toMSKfromUTC, toUTCfromMSK } from '../../utils/time';

export const teacherService = {
    /* -------------------------------------------------------------------------- */
    /* 🗓 Доступность преподавателя                                                */
    /* -------------------------------------------------------------------------- */

    /** Добавить новое доступное время преподавателя */
    async createAvailability(teacherId: number, startDate: Date, endDate: Date) {
        return prisma.teacherAvailability.create({
            data: { teacherId, startDate, endDate },
        });
    },

    /** Получить интервалы доступности за день (время в МСК) */
    async getTeacherAvailabilityForDay(teacherId: number, dateIso: string) {
        const startUtc = new Date(`${dateIso}T00:00:00Z`);
        const endUtc = new Date(`${dateIso}T23:59:59Z`);

        const intervals = await prisma.teacherAvailability.findMany({
            where: { teacherId, startDate: { gte: startUtc, lte: endUtc } },
            orderBy: { startDate: 'asc' },
        });

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

    /** Получить все интервалы за конкретный день (в UTC) */
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

    /** Удалить конкретный интервал доступности */
    async deleteAvailability(id: number, teacherId: number) {
        return prisma.teacherAvailability.deleteMany({
            where: { id, teacherId },
        });
    },

    /** Получить свободные дни по предмету (у преподавателей этого предмета) */
    async getFreeDaysBySubject(subjectId: number): Promise<string[]> {
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
                            if (b.end <= range.start || b.start >= range.end) return [range];
                            const newRanges = [];
                            if (b.start > range.start)
                                newRanges.push({ start: range.start, end: b.start });
                            if (b.end < range.end) newRanges.push({ start: b.end, end: range.end });
                            return newRanges;
                        });
                    }

                    if (freeRanges.some((r) => r.end - r.start > 5 * 60 * 1000)) {
                        freeDays.add(startOfDay.toISOString().split('T')[0]);
                    }

                    day.setDate(day.getDate() + 1);
                }
            }
        }

        return Array.from(freeDays).sort();
    },

    /* -------------------------------------------------------------------------- */
    /* 👨‍🏫 Информация о преподавателях                                            */
    /* -------------------------------------------------------------------------- */

    /** Получить преподавателя по ID */
    async getTeacherById(id: number) {
        return prisma.teacher.findUnique({
            where: { id },
            include: {
                subjects: { select: { id: true, name: true } },
                TeacherAvailability: true,
            },
        });
    },

    /** Получить всех преподавателей */
    async getAllTeachers() {
        return prisma.teacher.findMany({
            orderBy: { name: 'asc' },
            include: { subjects: true },
        });
    },

    /** Получить преподавателей по предмету */
    async getTeachersBySubject(subjectId: number) {
        return prisma.teacher.findMany({
            where: { subjects: { some: { id: subjectId } } },
            orderBy: { name: 'asc' },
            include: { subjects: true },
        });
    },

    /* -------------------------------------------------------------------------- */
    /* 💰 Баланс и транзакции преподавателей                                       */
    /* -------------------------------------------------------------------------- */

    /** Получить текущий баланс преподавателя */
    async getBalance(teacherId: number) {
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        return teacher?.balance ?? 0;
    },

    /** Пополнить баланс преподавателя (например, при оплате урока) */
    async increaseBalance(teacherId: number, amount: number, description = 'Начисление') {
        await prisma.teacher.update({
            where: { id: teacherId },
            data: { balance: { increment: amount } },
        });

        await prisma.teacherTransaction.create({
            data: {
                teacherId,
                type: 'LESSON_INCOME',
                amount,
                description,
            },
        });
    },

    /** Сделать выплату преподавателю (WITHDRAWAL) */
    async withdraw(teacherId: number, amount: number, description = 'Выплата преподавателю') {
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) throw new Error('Преподаватель не найден');

        if (teacher.balance < amount) {
            throw new Error('Недостаточно средств на балансе');
        }

        await prisma.$transaction([
            prisma.teacher.update({
                where: { id: teacherId },
                data: { balance: { decrement: amount } },
            }),
            prisma.teacherTransaction.create({
                data: {
                    teacherId,
                    type: 'WITHDRAWAL',
                    amount: -amount,
                    description,
                },
            }),
        ]);

        return await prisma.teacher.findUnique({ where: { id: teacherId } });
    },

    /** Получить историю транзакций преподавателя */
    async getTransactions(teacherId: number, limit = 20) {
        return prisma.teacherTransaction.findMany({
            where: { teacherId },
            orderBy: { date: 'desc' },
            take: limit,
        });
    },
};
