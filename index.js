const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const TOKEN = '7953285191:AAGWGtE_pIRNaY-NYjAygsiYV0tzvYCCcQw';
const CHANNEL_ID = '@jurabot1'; // با @ شروع شود
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.post('/', async (req, res) => {
    const body = req.body;

    // 1️⃣ مدیریت پیام لیست
    if (body.message && body.message.text === 'لیست') {
        const keyboard = {
            inline_keyboard: [
                [{ text: 'هستم ✅', callback_data: 'register_me' }]
            ]
        };

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: CHANNEL_ID,
            text: 'برای ثبت حضور خود روی دکمه زیر بزنید 👇',
            reply_markup: keyboard
        });
    }

    // 2️⃣ مدیریت دکمه شیشه‌ای
    if (body.callback_query) {
        const callback = body.callback_query;
        const user = callback.from;

        // خواندن فایل لیست
        let userList = [];
        if (fs.existsSync('list.json')) {
            userList = JSON.parse(fs.readFileSync('list.json'));
        }

        // چک اگر قبلا ثبت نشده باشد
        if (!userList.find(u => u.id === user.id)) {
            userList.push({
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || ''
            });

            fs.writeFileSync('list.json', JSON.stringify(userList, null, 2));

            // پاسخ به کاربر
            await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
                callback_query_id: callback.id,
                text: '✅ شما با موفقیت ثبت شدید.'
            });
        } else {
            await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
                callback_query_id: callback.id,
                text: '⚠️ شما قبلا ثبت شده‌اید.'
            });
        }
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`));
