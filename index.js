const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// توکن ربات4
const TOKEN = '7953285191:AAGWGtE_pIRNaY-NYjAygsiYV0tzvYCCcQw';
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.post('/', async (req, res) => {
    const message = req.body.message;

    if (message && message.text === '/start') {
        const chatId = message.chat.id;
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: 'ربات فعال شد ✅'
        });
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot is running on port ${PORT}`);
});
