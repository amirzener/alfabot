const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// مدیریت وضعیت کاربران
const userStates = {}; // { chatId: { step, botToken, webhookUrl } }

// توکن ربات مدیریتی برای مدیریت عملیات‌ها
const MANAGER_BOT_TOKEN = '7953285191:AAGWGtE_pIRNaY-NYjAygsiYV0tzvYCCcQw';

const TELEGRAM_API = `https://api.telegram.org/bot${MANAGER_BOT_TOKEN}`;

app.post('/webhook', async (req, res) => {
    const update = req.body;

    if (update.message) {
        const chatId = update.message.chat.id;
        const userName = update.message.from.first_name || 'کاربر';

        if (!userStates[chatId]) {
            userStates[chatId] = { step: 'awaiting_bot_token' };
            await sendMessage(chatId, `سلام ${userName} 🌷\nلطفاً Bot Token رباتی که میخواهید مدیریت کنید را ارسال کنید.`);
            return res.sendStatus(200);
        }

        const userState = userStates[chatId];

        if (userState.step === 'awaiting_bot_token') {
            userState.botToken = update.message.text.trim();
            userState.step = 'awaiting_webhook_url';
            await sendMessage(chatId, 'لطفاً Webhook URL خود را ارسال کنید:');
        } else if (userState.step === 'awaiting_webhook_url') {
            userState.webhookUrl = update.message.text.trim();
            userState.step = 'ready';

            const infoText = `✅ اطلاعات دریافت شد:
Bot Token: ${userState.botToken}
Webhook URL: ${userState.webhookUrl}

لطفاً انتخاب کنید چه عملیاتی انجام شود:`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '✅ ست کردن وبهوک', callback_data: 'setWebhook' }],
                    [{ text: '🗑️ حذف وبهوک', callback_data: 'deleteWebhook' }],
                    [{ text: '📊 نمایش آپدیت‌های در انتظار', callback_data: 'getUpdatesCount' }],
                    [{ text: '🧹 حذف آپدیت‌های در انتظار', callback_data: 'deletePendingUpdates' }],
                    [{ text: 'ℹ️ نمایش اطلاعات وبهوک', callback_data: 'getWebhookInfo' }]
                ]
            };

            await sendMessage(chatId, infoText, keyboard);
        }
    }

    if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const data = update.callback_query.data;
        const messageId = update.callback_query.message.message_id;
        const userState = userStates[chatId];

        if (!userState || !userState.botToken) {
            await sendMessage(chatId, 'لطفاً ابتدا دستور /start را ارسال و اطلاعات لازم را وارد کنید.');
            return res.sendStatus(200);
        }

        const botToken = userState.botToken;
        const webhookUrl = userState.webhookUrl;

        try {
            let resultMessage = '';

            if (data === 'setWebhook') {
                const response = await axios.get(`https://api.telegram.org/bot${botToken}/setWebhook`, {
                    params: { url: webhookUrl }
                });
                resultMessage = `✅ نتیجه ست کردن وبهوک:\n${JSON.stringify(response.data, null, 2)}`;
            } else if (data === 'deleteWebhook') {
                const response = await axios.get(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
                resultMessage = `🗑️ وبهوک حذف شد:\n${JSON.stringify(response.data, null, 2)}`;
            } else if (data === 'getWebhookInfo') {
                const response = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
                resultMessage = `ℹ️ اطلاعات وبهوک:\n${JSON.stringify(response.data, null, 2)}`;
            } else if (data === 'getUpdatesCount') {
                const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`);
                const updates = response.data.result;
                resultMessage = `📊 تعداد آپدیت‌های در انتظار: ${updates.length}`;
            } else if (data === 'deletePendingUpdates') {
                const response = await axios.get(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
                    params: { drop_pending_updates: true }
                });
                resultMessage = `🧹 آپدیت‌های در انتظار حذف شدند:\n${JSON.stringify(response.data, null, 2)}`;
            } else {
                resultMessage = 'دستور نامعتبر است.';
            }

            await answerCallbackQuery(update.callback_query.id);
            await editMessageText(chatId, messageId, resultMessage);
        } catch (error) {
            await sendMessage(chatId, `❌ خطا: ${error.message}`);
        }
    }

    res.sendStatus(200);
});

async function sendMessage(chatId, text, keyboard) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

async function answerCallbackQuery(callbackQueryId) {
    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId
    });
}

async function editMessageText(chatId, messageId, text) {
    await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: text
    });
}

app.listen(PORT, () => {
    console.log(`Telegram Webhook Manager Bot running on port ${PORT}`);
});
