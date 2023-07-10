FROM node:14

# Создайте рабочую директорию
WORKDIR /usr/src/app

# Скопируйте файлы приложения
COPY index.js package.json package-lock.json ./

# Установите зависимости
RUN npm install

# Откройте порт, на котором будет работать ваше приложение
EXPOSE 3000

# Запустите приложение при старте контейнера
CMD [ "node", "index.js" ]