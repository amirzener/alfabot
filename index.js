const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const TOKEN = '7953285191:AAGWGtE_pIRNaY-NYjAygsiYV0tzvYCCcQw';
const CHANNEL_ID = '@jurabot1';
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.post('/', async (req, res) => {
    const body = req.body;

    // ذخیره پیام ارسالی در کانال برای ویرایش
    if (body.message && body.message.text === 'لیست') {
        const keyboard = {
            inline_keyboard: [
                [{ text: 'هستم ✅', callback_data: 'register_me' }]
            ]
        };

        const sentMessage = await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: CHANNEL_ID,
            text: 'برای ثبت حضور روی دکمه زیر بزنید 👇',
            reply_markup: keyboard
        });

        // ذخیره chat_id و message_id پیام کانال
        const msgInfo = {
            chat_id: sentMessage.data.result.chat.id,
            message_id: sentMessage.data.result.message_id
        };
        fs.writeFileSync('message.json', JSON.stringify(msgInfo, null, 2));
    }

    // مدیریت کلیک دکمه
    if (body.callback_query) {
        const callback = body.callback_query;
        const user = callback.from;

        // خواندن فایل لیست
        let userList = [];
        if (fs.existsSync('list.json')) {
            userList = JSON.parse(fs.readFileSync('list.json'));
        }

        let messageText = '';

        // اگر کاربر قبلاً ثبت نشده
        if (!userList.find(u => u.id === user.id)) {
            userList.push({
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || ''
            });

            fs.writeFileSync('list.json', JSON.stringify(userList, null, 2));

            // ایجاد متن شماره‌گذاری شده
            messageText = '✅ **لیست افراد ثبت شده:**\n\n';
            userList.forEach((u, index) => {
                const name = u.username ? `@${u.username}` : `${u.first_name} ${u.last_name}`;
                messageText += `${index + 1}- ${name}\n`;
            });

            // خواندن chat_id و message_id برای ویرایش پیام
            if (fs.existsSync('message.json')) {
                const msgInfo = JSON.parse(fs.readFileSync('message.json'));
                const keyboard = {
                    inline_keyboard: [
                        [{ text: 'هستم ✅', callback_data: 'register_me' }]
                    ]
                };

                await axios.post(`${TELEGRAM_API}/editMessageText`, {
                    chat_id: msgInfo.chat_id,
                    message_id: msgInfo.message_id,
                    text: messageText,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }

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
