import prisma from '../../core/prisma';

export const studentService = {
    /** 📄 Получить студентов с пагинацией */
    async getStudentsPaginated(page = 1, pageSize = 5) {
        const skip = (page - 1) * pageSize;

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    teachers: { select: { name: true } },
                    abonements: {
                        include: {
                            template: { select: { name: true, lessons: true } },
                            visits: true,
                        },
                    },
                },
            }),
            prisma.student.count(),
        ]);

        const totalPages = Math.ceil(total / pageSize);

        // 🧮 Добавляем данные о визитах
        const enrichedStudents = students.map((student) => ({
            ...student,
            abonements: student.abonements.map((a) => ({
                ...a,
                totalLessons: a.template.lessons,
                usedLessons: a.visits.length,
                remainingLessons: Math.max(a.template.lessons - a.visits.length, 0),
            })),
        }));

        return { students: enrichedStudents, totalPages };
    },

    /** 🔍 Поиск по телефону */
    async searchByPhone(phone: string) {
        const students = await prisma.student.findMany({
            where: { phone: { contains: phone } },
            include: {
                teachers: { select: { name: true } },
                abonements: {
                    include: {
                        template: { select: { name: true, lessons: true } },
                        visits: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return students.map((student) => ({
            ...student,
            abonements: student.abonements.map((a) => ({
                ...a,
                totalLessons: a.template.lessons,
                usedLessons: a.visits.length,
                remainingLessons: Math.max(a.template.lessons - a.visits.length, 0),
            })),
        }));
    },

    /** ➕ Создает нового ученика */
    async createStudent(data: {
        firstName: string;
        lastName?: string;
        phone: string;
        age?: number;
        source?: string;
        note?: string;
    }) {
        const existing = await prisma.student.findUnique({ where: { phone: data.phone } });
        if (existing) throw new Error('Ученик с таким телефоном уже существует');

        return prisma.student.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName || null,
                phone: data.phone,
                age: data.age || null,
                source: data.source || null,
                note: data.note || null,
            },
        });
    },

    /** 👤 Получить одного ученика */
    async getStudent(studentId: number) {
        const student = await prisma.student.findUnique({
            where: { id: studentId! },
            include: {
                teachers: { select: { name: true } },
                abonements: {
                    include: {
                        template: { select: { name: true, lessons: true } },
                        visits: true,
                    },
                },
            },
        });

        if (!student) return null;

        return {
            ...student,
            abonements: student.abonements.map((a) => ({
                ...a,
                totalLessons: a.template.lessons,
                usedLessons: a.visits.length,
                remainingLessons: Math.max(a.template.lessons - a.visits.length, 0),
            })),
        };
    },

    /** 📋 Получить всех студентов */
    async getAllStudents() {
        const students = await prisma.student.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                teachers: { select: { name: true } },
                abonements: {
                    include: {
                        template: { select: { name: true, lessons: true } },
                        visits: true,
                    },
                },
            },
        });

        return students.map((student) => ({
            ...student,
            abonements: student.abonements.map((a) => ({
                ...a,
                totalLessons: a.template.lessons,
                usedLessons: a.visits.length,
                remainingLessons: Math.max(a.template.lessons - a.visits.length, 0),
            })),
        }));
    },

    /**
     * Получить данные ученика со всеми зависимостями.
     */
    async getStudentById(id: number) {
        return prisma.student.findUnique({
            where: { id },
            include: {
                abonements: {
                    include: {
                        template: { select: { name: true, lessons: true, duration: true } },
                        teacher: { select: { id: true, name: true } },
                        visits: true,
                    },
                },
                schedules: true,
            },
        });
    },

    /**
     * Отфильтровать абонементы ученика по преподавателю (если нужно).
     */
    filterAbonementsForTeacher(abonements: any[], teacherId?: number) {
        if (!teacherId) return abonements;
        return abonements.filter((a) => a.teacherId === teacherId);
    },

    /**
     * Найти активный абонемент ученика (по текущей дате).
     */
    findActiveAbonement(abonements: any[]) {
        const now = new Date();
        return abonements.find((a) => a.startDate <= now && a.endDate >= now);
    },

    /**
     * Сформировать текст абонементов для карточки ученика.
     */
    formatAbonements(student: any, abonements: any[], isTeacher: boolean): string {
        if (!abonements.length) {
            return isTeacher
                ? 'У вас нет абонементов с этим учеником.'
                : 'Нет активных абонементов.';
        }

        return abonements
            .map((a) => {
                const used = student.schedules.filter((s: any) => s.abonementId === a.id).length;
                const total = a.template?.lessons ?? 0;
                const remaining = Math.max(total - used, 0);
                const name = a.template?.name ?? 'Без названия';
                const teacherName = a.teacher?.name ?? '—';
                const end = a.endDate.toLocaleDateString('ru-RU');

                return (
                    `• *${name}*\n` +
                    `  👨‍🏫 ${teacherName}\n` +
                    `  🎫 Уроки: ${used}/${total} (осталось ${remaining})\n` +
                    `  ⏳ до ${end}`
                );
            })
            .join('\n\n');
    },

    /**
     * Получить всех учеников преподавателя (с фильтром по его абонементам).
     */
    async getAllStudentsForTeacher(teacherId: number) {
        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: {
                students: {
                    orderBy: { firstName: 'asc' },
                    include: {
                        abonements: {
                            where: { teacherId, status: { not: 'CLOSED' }, },
                            include: {
                                template: { select: { name: true, lessons: true } },
                                Schedule: true,
                            },
                        },
                        schedules: {
                            select: {
                                id: true,
                                abonementId: true,
                            },
                        },
                    },
                },
            },
        });

        return teacher?.students ?? [];
    }
};
