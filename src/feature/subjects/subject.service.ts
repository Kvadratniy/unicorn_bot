import prisma from '../../core/prisma';

export const subjectService = {
    async getAllSubjects() {
        return prisma.subject.findMany({
            orderBy: { name: 'asc' },
            include: {
                teachers: { select: { name: true } },
            },
        });
    },

    async createSubject(name: string, duration: number) {
        if (!name.trim()) throw new Error('Название предмета не может быть пустым');
        if (duration <= 0) throw new Error('Длительность должна быть больше 0');
        return prisma.subject.create({ data: { name, duration } });
    },
};
