import prisma from '../../core/prisma';
import { PaymentMethod, PaymentType, PaymentStatus } from '@prisma/client';

export const paymentService = {
    /** Получить абонемент с учеником */
    async getAbonementById(id: number) {
        return prisma.abonement.findUnique({
            where: { id },
            include: { student: true },
        });
    },

    /** Создать оплату */
    async createPayment(params: {
        studentId: number;
        abonementId: number;
        amount: number;
        method: PaymentMethod;
        comment?: string;
    }) {
        const { studentId, abonementId, amount, method, comment } = params;
        return prisma.payment.create({
            data: {
                studentId,
                abonementId,
                type: PaymentType.ABONEMENT,
                method,
                amount,
                comment,
                status: PaymentStatus.PAID,
                date: new Date(),
            },
        });
    },

    /** Активировать абонемент, если он неоплачен */
    async activateAbonementIfUnpaid(id: number) {
        const abonement = await prisma.abonement.findUnique({ where: { id } });
        if (abonement?.status === 'UNPAIND') {
            await prisma.abonement.update({
                where: { id },
                data: { status: 'ACTIVE' },
            });
        }
    },
};
