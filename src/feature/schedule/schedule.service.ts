import prisma from '../../core/prisma';
import { toMSKfromUTC } from '../../utils/time';

export const scheduleService = {
    // Получить все предметы
    async getSubjects() {
        return prisma.subject.findMany({ orderBy: { name: 'asc' } });
    },

    // Получить предмет с учителями
    async getSubjectWithTeachers(subjectId: number) {
        return prisma.subject.findUnique({
            where: { id: subjectId },
            include: { teachers: true },
        });
    },

    // Получить расписание преподавателя за день
    async getTeacherSchedulesForDate(teacherId: number, startOfDay: Date, endOfDay: Date) {
        return prisma.schedule.findMany({
            where: {
                teacherId,
                startDate: { gte: startOfDay, lt: endOfDay },
            },
            include: { subject: true },
            orderBy: { startDate: 'asc' },
        });
    },

    // Получить доступность преподавателя за день
    async getTeacherAvailability(teacherId: number, startOfDay: Date, endOfDay: Date) {
        return prisma.teacherAvailability.findMany({
            where: { teacherId, startDate: { gte: startOfDay, lt: endOfDay } },
            orderBy: { startDate: 'asc' },
        });
    },

    // Проверить конфликт по времени
    async hasConflict(teacherId: number, start: Date, end: Date) {
        const conflict = await prisma.schedule.findFirst({
            where: {
                teacherId,
                OR: [
                    { startDate: { lt: end }, endDate: { gt: start } }, // пересечение по диапазону
                ],
            },
        });
        return !!conflict;
    },

    // Создать занятие
    async createLesson(
        startDate: Date,
        endDate: Date,
        studentId: number,
        teacherId: number,
        subjectId: number,
        type: 'ONETIME' | 'ABONEMENT' | 'TRIAL',
        abonementId?: number,
    ) {
        return prisma.schedule.create({
            data: {
                startDate,
                endDate,
                teacherId,
                subjectId,
                abonementId,
                type,
                students: { connect: [{ id: studentId }] },
            },
        });
    },

    // Получить преподавателя
    async getTeacher(teacherId: number) {
        return prisma.teacher.findUnique({
            where: { id: teacherId },
            include: { user: true, subjects: true },
        });
    },

    // Получить расписание за период
    async getSchedulesByDateRange(start: Date, end: Date) {
        return prisma.schedule.findMany({
            where: {
                startDate: { gte: start, lt: end },
            },
            orderBy: { startDate: 'asc' },
            include: {
                teacher: true,
                subject: true,
                students: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                visits: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
    },

    // Получить детали конкретного занятия
    async getScheduleDetails(id: number) {
        return prisma.schedule.findUnique({
            where: { id },
            include: {
                teacher: true,
                subject: true,
                students: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                visits: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
    },

    // ❌ Отменить занятие
    async cancelLesson(scheduleId: number) {
        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            include: {
                teacher: true,
                subject: true,
                students: true,
            },
        });

        if (!schedule) return null;

        await prisma.schedule.delete({ where: { id: scheduleId } });
        return schedule;
    },

    // /** Получить занятия за указанный день */
    // async getSchedulesByDateRange(startDate: Date, endDate: Date) {
    //     return prisma.schedule.findMany({
    //         where: { startDate: { gte: startDate }, endDate: { lt: endDate } },
    //         include: {
    //             subject: true,
    //             teacher: true,
    //             students: true,
    //         },
    //         orderBy: { startDate: 'asc' },
    //     });
    // },

    /** Получить доступность преподавателей за день */
    async getTeacherAvailabilitiesByDay(startDate: Date, endDate: Date) {
        return prisma.teacherAvailability.findMany({
            where: { startDate: { gte: startDate, lt: endDate } },
            include: { teacher: true },
            orderBy: { startDate: 'asc' },
        });
    },

    /**
     * Отменяет занятие и возвращает детали
     */
    async cancelSchedule(id: number) {
        const schedule = await scheduleService.getScheduleDetails(id);
        if (!schedule) return null;

        await prisma.schedule.delete({ where: { id } });
        return schedule;
    },

    /**
     * Отправить уведомление преподавателю, если у него есть Telegram ID
     */
    async notifyTeacherAboutCancellation(ctx: any, schedule: any) {
        const teacherUser = await prisma.user.findUnique({
            where: { teacherId: schedule.teacherId },
        });

        if (!teacherUser?.telegramId) return;

        const mskDate = toMSKfromUTC(schedule.startDate);
        const msg =
            `❌ *Занятие отменено!*\n\n` +
            `📅 ${mskDate.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}\n` +
            `🕒 ${mskDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Moscow',
            })}\n` +
            `📘 ${schedule.subject.name}`;

        await ctx.telegram
            .sendMessage(teacherUser.telegramId, msg, { parse_mode: 'Markdown' })
            .catch(() => {});
    },
};
