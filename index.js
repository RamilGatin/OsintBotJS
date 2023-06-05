const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

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
let base64Image = ""
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.photo[msg.photo.length - 1].file_id;

    bot.getFile(fileId).then((fileInfo) => {
        const fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${fileInfo.file_path}`;
        const fileName = `photo_${Date.now()}.jpg`;
        const imageStream = fs.createWriteStream(fileName);
        // Скачиваем и сохраняем фотографию в файл
        https.get(fileUrl, (response) => {
            response.pipe(imageStream);
            response.on('end', () => {
                // Читаем содержимое файла, преобразуем его в base64 и удаляем исходный файл
                fs.readFile(fileName, (err, data) => {
                    if (err) throw err;
                    base64Image = data.toString('base64');
                    // fs.unlink(fileName, () => {
                    //     console.log(`File ${fileName} was deleted`);
                    // });
                });
            });
        });
    });


    // Получаем информацию о файле изображения
    const fileInfo = await bot.getFile(fileId);
    console.log("fileInfo", fileInfo)

    // Заглушка response
    // Todo: Разобраться с телеграм ботом, чтобы он возвращал base64 кодировку
    // const response = {
    //     "jsonrpc": "2.0",
    //     "result": {
    //         "image": "6479f4e3aca844.75881736.jpg",
    //         "faces": [
    //             {
    //                 "x": 366,
    //                 "y": 359,
    //                 "width": 389,
    //                 "height": 525,
    //                 "lm1_x": 458,
    //                 "lm1_y": 566,
    //                 "lm2_x": 630,
    //                 "lm2_y": 572,
    //                 "lm3_x": 506,
    //                 "lm3_y": 679,
    //                 "lm4_x": 442,
    //                 "lm4_y": 747,
    //                 "lm5_x": 616,
    //                 "lm5_y": 765
    //             }
    //         ]
    //     },
    //     id: 100
    // }
    console.log("base64Image", base64Image)
    // Что было.
    // Скачиваем изображение с сервера телеграмм и отправляем его на сервер search4faces.com для обнаружения лиц
    const response = await axios.post('https://search4faces.com/api/json-rpc/v1', {
        jsonrpc: '2.0',
        method: 'detectFaces',
        id: 'some-id',
        params: {
            image: base64Image
        }
    }, {
        headers: {
            'Content-Type': 'application/json',
            'x-authorization-token': search4facesToken
        }
    });


    const faces = response.result.faces;
    if (faces.length > 0) {
        const searchResponse = await axios({
            method: 'post',
            url: 'https://search4faces.com/api/json-rpc/v1',
            data: {
                jsonrpc: "2.0",
                method: "searchFace",
                id: 100,
                params: {
                    image: response.result.image,
                    face: response.result.faces[0],
                    source: "vk_wall",
                    hidden: true,
                    results: 10,
                    lang: "ru"
                }
            },
            headers: {
                'Content-Type': 'application/json',
                'x-authorization-token': search4facesToken
            }

        })

        // Обрабатываем ответ от API и отправляем пользователю ссылки на найденные профили в социальных сетях
        const profiles = searchResponse.data.result.profiles;
        if (profiles.length > 0) {
            let message = 'Найдены похожие лица в следующих социальных сетях:\n';
            profiles.forEach(profile => {
                message += `- ${profile.profile}\n`;
            });
            await bot.sendMessage(chatId, message);
        } else {
            await bot.sendMessage(chatId, 'Похожие лица не найдены.');
        }
    }
    else {
        // Если на изображении не обнаружены лица, отправляем сообщение об ошибке
        await bot.sendMessage(chatId, 'На изображении не обнаружены лица.');
    }
});