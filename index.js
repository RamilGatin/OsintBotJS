const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Задаем API ключ для телеграмм бота и API ключ для сайта search4faces.com
const telegramBotToken = '6044787090:AAHp51UHwLBdAgg3erIgCuG0sJB-HaQgQdU';
const search4facesToken = 'fbce9c-fa1595-d24af2-e6333c-87067a';

// Создаем экземпляр телеграмм бота
const bot = new TelegramBot(telegramBotToken, {polling: true});




const Prometheus = require('prom-client');
const register = Prometheus.register;

// Создание счетчика метрики для обработанных фотографий
const processedPhotosCounter = new Prometheus.Counter({
    name: 'telegram_bot_processed_photos_total',
    help: 'Total number of processed photos',
    labelNames: ['chat_id'],
});


// Регистрация метрик в реестре
register.registerMetric(processedPhotosCounter);

// HTTP-обработчик для предоставления метрик Prometheus
http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
        res.setHeader('Content-Type', register.contentType);
        res.end(await register.metrics());
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
}).listen(8080, () => {
    console.log('HTTP server is running on port 8080');
});








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

    bot.getFile(fileId)
        .then((fileInfo) => {
            const fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${fileInfo.file_path}`;
            const fileName = `photo_${Date.now()}.jpg`;
            const imageStream = fs.createWriteStream(fileName);
            // Скачиваем и сохраняем фотографию в файл
            https.get(fileUrl, (response) => {
                response.pipe(imageStream);
                response.on('end', () => {
                    // Читаем содержимое файла, преобразуем его в base64 и удаляем исходный файл
                    fs.readFile(fileName, async (err, data) => {
                        if (err) throw err;
                        base64Image = data.toString('base64');
                        await bot.sendMessage(chatId, 'Загрузка лица...');
                        const response = await axios.post('https://search4faces.com/api/json-rpc/v1', {
                            jsonrpc: '2.0',
                            method: 'detectFaces',
                            id: 123,
                            params: {
                                image: base64Image
                            }
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'x-authorization-token': search4facesToken
                            }
                        });
                        await bot.sendMessage(chatId, 'Начинаю поиск...');
                        console.log('response', response.data)
                        const responseData = response.data
                        const faces = responseData.result.faces;
                        console.log('faces', faces)
                        if (faces.length > 0) {
                            const searchResponse = await axios({
                                method: 'post',
                                url: 'https://search4faces.com/api/json-rpc/v1',
                                data: {
                                    jsonrpc: "2.0",
                                    method: "searchFace",
                                    id: 100,
                                    params: {
                                        image: responseData.result.image,
                                        face: responseData.result.faces[0],
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
                            console.log('searchResponse', searchResponse)
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
                        } else {
                            // Если на изображении не обнаружены лица, отправляем сообщение об ошибке
                            await bot.sendMessage(chatId, 'На изображении не обнаружены лица.');
                        }




                        processedPhotosCounter.inc({ chat_id: chatId });





                        // helloTest = base64Image
                        fs.unlink(fileName, () => {
                            // helloTest = base64Image
                            console.log(`File ${fileName} was deleted`);
                        });
                    });
                });
            });
        })
});

