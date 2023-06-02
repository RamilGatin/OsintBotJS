const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Задаем API ключ для телеграмм бота и API ключ для сайта search4faces.com
const telegramBotToken = '6044787090:AAHp51UHwLBdAgg3erIgCuG0sJB-HaQgQdU';
const search4facesToken = 'fbce9c-fa1595-d24af2-e6333c-87067a';

// Создаем экземпляр телеграмм бота
const bot = new TelegramBot(telegramBotToken, {polling: true});

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Отправь мне фотографию, и я найду похожие лица в социальных сетях.');
});

// Обработчик получения изображения от пользователя
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.photo[msg.photo.length - 1].file_id;

    // Получаем информацию о файле изображения
    const fileInfo = await bot.getFile(fileId);
    console.log("fileInfo", fileInfo)
    // Скачиваем изображение с сервера телеграмм и отправляем его на сервер search4faces.com для обнаружения лиц
    // const response = await axios.post('https://search4faces.com/api/json-rpc/v1', {
    //     jsonrpc: '2.0',
    //     method: 'detectFaces',
    //     id: 'some-id',
    //     params: {
    //         image: fileInfo.fileLink
    //     }
    // }, {
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'x-authorization-token': search4facesToken
    //     }
    // });

    const response = await axios({
            method: "post",
            url: "https://search4faces.com/api/json-rpc/v1",
            headers: {
                'Content-Type': 'application/json',
                'x-authorization-token': search4facesToken
            },
            data: {
                jsonrpc: '2.0',
                method: 'detectFaces',
                id: 'some-id',
                params: {
                    image: fileInfo.fileLink
                }
            }
        }
    )
    // Обрабатываем ответ от API
    console.log(response.data)
    const faces = response.data.result.faces;
    if (faces.length > 0) {
        // Если на изображении обнаружены лица, отправляем запрос на API сайта search4faces.com для поиска похожих лиц в социальных сетях
        const searchResponse = await axios.post('https://search4faces.com/api/json-rpc/v1', {
            jsonrpc: '2.0',
            method: 'searchFace',
            id: 'some-id',
            params: {
                image: fileInfo.fileLink,
                face: faces[0].base64,
                maxResults: 10
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-authorization-token': search4facesToken
            }
        });

        // Обрабатываем ответ от API и отправляем пользователю ссылки на найденные профили в социальных сетях
        const profiles = searchResponse.data.result.profiles;
        if (profiles.length > 0) {
            let message = 'Найдены похожие лица в следующих социальных сетях:\n';
            profiles.forEach(profile => {
                message += `- ${profile.url}\n`;
            });
            bot.sendMessage(chatId, message);
        } else {
            bot.sendMessage(chatId, 'Похожие лица не найдены.');
        }
    } else {
        // Если на изображении не обнаружены лица, отправляем сообщение об ошибке
        bot.sendMessage(chatId, 'На изображении не обнаружены лица.');
    }
});