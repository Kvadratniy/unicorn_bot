import prisma from '../../core/prisma';
import { Prisma } from '@prisma/client';

export const abonementService = {
    /**
     * Получить все шаблоны абонементов
     */
    async getAllTemplates() {
        try {
            return await prisma.abonementTemplate.findMany({
                include: {
                    subject: { select: { name: true } },
                },
                orderBy: { price: 'asc' },
            });
        } catch (error) {
            console.error('abonementTemplateService.getAllTemplates error:', error);
            throw new Error('Ошибка при получении списка шаблонов абонементов');
        }
    },

    /** Получить список всех предметов */
    async getSubjects() {
        return prisma.subject.findMany({ orderBy: { name: 'asc' } });
    },

    /** Получить шаблоны абонементов по предмету */
    async getTemplatesBySubject(subjectId: number) {
        return prisma.abonementTemplate.findMany({
            where: { subjectId },
            orderBy: { price: 'asc' },
        });
    },

    /** Получить преподавателей, ведущих конкретный предмет */
    async getTeachersBySubject(subjectId: number) {
        return prisma.teacher.findMany({
            where: { subjects: { some: { id: subjectId } } },
            orderBy: { name: 'asc' },
        });
    },

    /** Получить шаблон абонемента по ID */
    async getTemplateById(id: number) {
        return prisma.abonementTemplate.findUnique({
            where: { id },
            include: { subject: true },
        });
    },

    /** Получить преподавателя по ID */
    async getTeacherById(id: number) {
        return prisma.teacher.findUnique({ where: { id } });
    },

    /** Создать новый абонемент */
    async createAbonement(data: {
        templateId: number;
        studentId: number;
        teacherId: number;
        subjectId: number;
        startDate: Date;
        endDate: Date;
    }) {
        return prisma.abonement.create({ data });
    },

    async getUnpaidAbonements() {
        try {
            return await prisma.abonement.findMany({
                where: { status: 'UNPAIND' },
                include: {
                    student: true,
                    teacher: true,
                    Subject: true, // 👈 если в схеме именно так
                    template: { include: { subject: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        } catch (error) {
            console.error('abonementService.getUnpaidAbonements error:', error);
            throw new Error('Ошибка при получении неоплаченных абонементов');
        }
    },

    /**
     * Обновить статус абонемента
     */
    async updateStatus(id: number, status: Prisma.AbonementUpdateInput['status']) {
        try {
            return await prisma.abonement.update({
                where: { id },
                data: { status },
            });
        } catch (error) {
            console.error('abonementService.updateStatus error:', error);
            throw new Error('Ошибка при обновлении статуса абонемента');
        }
    },

    /**
     * Получить абонемент по ID
     */
    async getById(id: number) {
        return prisma.abonement.findUnique({
            where: { id },
            include: { template: true, Subject: true },
        });
    },

    /**
     * Получить все абонементы ученика у конкретного преподавателя
     */
    async getByStudentAndTeacher(studentId: number, teacherId: number) {
        return prisma.abonement.findMany({
            where: {
                studentId,
                teacherId,
                status: { in: ['ACTIVE', 'UNPAIND'] },
            },
            include: {
                template: true,
                Subject: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },
};
