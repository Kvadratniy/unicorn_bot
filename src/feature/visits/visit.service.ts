import prisma from '../../core/prisma';
import { Prisma } from '@prisma/client';

export type VisitWithRelations = Prisma.VisitGetPayload<{
    include: {
        student: true;
        schedule: {
            include: {
                teacher: true;
                subject: true;
            };
        };
        payment: true;
        abonement: {
            include: { template: true };
        };
    };
}>;

export const visitService = {
    async getUserByTelegramId(telegramId: string) {
        return prisma.user.findUnique({
            where: { telegramId },
            include: { teacher: true },
        });
    },

    async getVisitsCount(whereClause: Prisma.VisitWhereInput) {
        return prisma.visit.count({ where: whereClause });
    },

    async getVisits(whereClause: Prisma.VisitWhereInput, skip: number, take: number) {
        return prisma.visit.findMany({
            where: whereClause,
            include: {
                student: true,
                schedule: { include: { teacher: true, subject: true } },
                payment: true,
                abonement: { include: { template: true } },
            },
            orderBy: { date: 'desc' },
            skip,
            take,
        });
    },
};
