import { PrismaClient, Role } from '@prisma/client';

// Один глобальный экземпляр PrismaClient для всего проекта
const prisma = new PrismaClient();

export default prisma;
export { Role };
