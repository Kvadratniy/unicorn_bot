# Базовый образ
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Устанавливаем ts-node для seed
RUN npm install -D ts-node typescript @types/node

# Устанавливаем PostgreSQL client для pg_isready
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Копируем весь проект
COPY . .

# Компилируем TypeScript
RUN npx tsc

# Копируем entrypoint и делаем его исполняемым
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Команда запуска
CMD ["./entrypoint.sh"]
