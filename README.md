# OsintBotJS

___

### Описание Бота
Это бот, который по загруженной Вами фотографии лица человека помогает найти его профиль в социальной сети Вконтакте.

Пример работы бота: ![image](https://github.com/RamilGatin/OsintBotJS/blob/master/screenshot%201.png)

---

### Стек технологий
Бот написан на Node.JS, используя node-telegram-bot-api для программирования бота и axios для работы с API.

___

## Мониторинг работы бота

### Описание компонентов подсистемы: 
Prometheus:

- Система мониторинга и сбора метрик.
- Собирает метрики о производительности и состоянии системы и приложения.
- Хранит метрики и предоставляет API для запроса метрик.

Grafana:

- Инструмент для визуализации и анализа данных мониторинга.
- Получает данные метрик из Prometheus и отображает их в виде графиков, панелей и дашбордов.

Expoter: 

- Cобирает и предоставляет метрики для систем мониторинга, таких как Prometheus.

В этом проекте я написал свой экспортер, используя библиотеку 'prom-client'

```javascript

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

```
Данный код создает счетчик метрики для отслеживания обработанных фотографий, регистрирует эту метрику в реестре Prometheus и предоставляет метрики Prometheus через HTTP-обработчик, доступный по пути "/metrics" на порту 8080. Это позволяет Prometheus собирать и сохранять эти метрики для последующего использования в мониторинге и визуализации с помощью Grafana


### Метрики
В качестве метрики я использовал количество отправленных фотографий пользователями.

### Графики в Grafana

Пример отображения метрики (количество отправленных фотографий пользователями) ![image](https://github.com/RamilGatin/OsintBotJS/blob/master/screenshot%202.png)


## Инструкция по разворачиванию мониторинг стенда:

- В терминале необходимо перейти в папку с проектом.

- Ввести команду ```docker-compose up```

- Prometheus работает на ```http://localhost:9090```

- Grafana работает на ```http://localhost:8080```

- Выбрать метрику ```telegram_bot_processed_photos_total```







