#!/bin/sh
set -e

echo "Ждём базу..."
until pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT; do
  sleep 1
done

echo "Генерируем Prisma Client..."
npx prisma generate
#
## echo "Сбрасываем базу..."
npx prisma migrate reset --force
#
## echo "Применяем миграции..."
npx prisma migrate dev --name init
#
## echo "Заполняем seed..."
npx ts-node prisma/seed.ts

echo "Запускаем бота..."
node dist/bot.js
