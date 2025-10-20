import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // --- Предметы ---
    const vocal = await prisma.subject.upsert({
        where: { name: 'Вокал' },
        update: {},
        create: { name: 'Вокал', duration: 60 },
    });

    const piano = await prisma.subject.upsert({
        where: { name: 'Фортепиано' },
        update: {},
        create: { name: 'Фортепиано', duration: 60 },
    });

    // --- Учителя ---
    const teacher1 = await prisma.teacher.create({
        data: {
            name: 'Анна Вокалист',
            phone: '79990000001',
            subjects: { connect: [{ id: vocal.id }] },
        },
    });

    const teacher2 = await prisma.teacher.create({
        data: {
            name: 'Екатерина Голос',
            phone: '79990000002',
            subjects: { connect: [{ id: vocal.id }] },
        },
    });

    const teacher3 = await prisma.teacher.create({
        data: {
            name: 'Иван Клавишный',
            phone: '79990000003',
            subjects: { connect: [{ id: piano.id }] },
        },
    });

    // --- Абонементы ---
    const abonementTemplates = [
        { lessons: 5, price: 10000 },
        { lessons: 8, price: 14000 },
        { lessons: 10, price: 17000 },
        { lessons: 12, price: 20000 },
        { lessons: 15, price: 25000 },
        { lessons: 20, price: 30000 },
    ];

    for (const tpl of abonementTemplates) {
        await prisma.abonementTemplate.createMany({
            data: [
                {
                    name: `Вокал ${tpl.lessons} занятий`,
                    lessons: tpl.lessons,
                    duration: 60,
                    price: tpl.price,
                    subjectId: vocal.id,
                },
                {
                    name: `Фортепиано ${tpl.lessons} занятий`,
                    lessons: tpl.lessons,
                    duration: 60,
                    price: tpl.price,
                    subjectId: piano.id,
                },
            ],
            skipDuplicates: true,
        });
    }

    console.log('✅ Сид выполнен успешно!');
}

main()
    .catch((e) => {
        console.error('Ошибка при сидировании:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
