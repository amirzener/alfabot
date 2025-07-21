// 📌 Telegram Webhook Manager Bot (نسخه تمیز و آماده اجرا در Render)

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// وضعیت کاربران
const userStates = {}; // { chatId: { step, botToken, webhookUrl } }

// توکن ربات مدیریتی
const MANAGER_BOT_TOKEN = process.env.MANAGER_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${MANAGER_BOT_TOKEN}`;

// هندل وبهوک
app.post('/webhook', async (req, res) => {
    const update = req.body;

    try {
        if (update.message) {
            const chatId = update.message.chat.id;
            const userName = update.message.from.first_name || 'کاربر';
            const text = update.message.text;

            if (text === '/start') {
                userStates[chatId] = { step: 'awaiting_bot_token' };
                await sendMessage(chatId, `سلام ${userName} 🌷\nلطفاً Bot Token رباتی که می‌خواهید مدیریت کنید را ارسال کنید.`);
                return res.sendStatus(200);
            }

            if (!userStates[chatId]) {
                await sendMessage(chatId, `سلام ${userName} 🌷\nبرای شروع دستور /start را ارسال کنید.`);
                return res.sendStatus(200);
            }

            const userState = userStates[chatId];

            if (userState.step === 'awaiting_bot_token') {
                userState.botToken = text.trim();
                userState.step = 'awaiting_webhook_url';
                await sendMessage(chatId, 'لطفاً Webhook URL خود را ارسال کنید:');
            } else if (userState.step === 'awaiting_webhook_url') {
                userState.webhookUrl = text.trim();

                if (!userState.webhookUrl.startsWith('https://')) {
                    await sendMessage(chatId, '❌ لینک وبهوک باید با https شروع شود. لطفاً یک لینک معتبر ارسال کنید.');
                    return res.sendStatus(200);
                }

                userState.step = 'ready';

                const infoText = `✅ اطلاعات دریافت شد:\n\nBot Token: ${userState.botToken}\nWebhook URL: ${userState.webhookUrl}\n\nلطفاً انتخاب کنید چه عملیاتی انجام شود:`;

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
            const messageId = update.callback_query.message.message_id;
            const data = update.callback_query.data;
            const userState = userStates[chatId];

            if (!userState || !userState.botToken) {
                await sendMessage(chatId, 'لطفاً ابتدا دستور /start را ارسال و اطلاعات لازم را وارد کنید.');
                return res.sendStatus(200);
            }

            const botToken = userState.botToken;
            const webhookUrl = userState.webhookUrl;
            let resultMessage = '';

            try {
                if (data === 'setWebhook') {
                    const response = await axios.get(`https://api.telegram.org/bot${botToken}/setWebhook`, { params: { url: webhookUrl } });
                    resultMessage = `✅ نتیجه ست کردن وبهوک:\n${JSON.stringify(response.data, null, 2)}`;
                } else if (data === 'deleteWebhook') {
                    const response = await axios.get(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
                    resultMessage = `🗑️ وبهوک حذف شد:\n${JSON.stringify(response.data, null, 2)}`;
                } else if (data === 'getWebhookInfo') {
                    const response = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
                    const info = response.data.result;
                    let formattedInfo = `ℹ️ *اطلاعات وبهوک:*\n`;
                    formattedInfo += `\n🌐 *URL:* ${info.url || 'تنظیم نشده'}`;
                    formattedInfo += `\n✅ *فعال:* ${info.has_custom_certificate ? 'بله' : 'خیر'}`;
                    formattedInfo += `\n🔒 *گواهی اختصاصی:* ${info.has_custom_certificate ? 'دارد' : 'ندارد'}`;
                    formattedInfo += `\n📥 *تعداد آپدیت‌های در انتظار:* ${info.pending_update_count}`;
                    if (info.last_error_date) {
                        const errorDate = new Date(info.last_error_date * 1000).toLocaleString('fa-IR');
                        formattedInfo += `\n⚠️ *آخرین خطا:* ${errorDate}\n📝 پیام: ${info.last_error_message}`;
                    }
                    if (info.ip_address) {
                        formattedInfo += `\n🖥️ *IP سرور:* ${info.ip_address}`;
                    }
                    resultMessage = formattedInfo;
                } else if (data === 'getUpdatesCount') {
                    const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`);
                    resultMessage = `📊 تعداد آپدیت‌های در انتظار: ${response.data.result.length}`;
                } else if (data === 'deletePendingUpdates') {
                    const response = await axios.get(`https://api.telegram.org/bot${botToken}/deleteWebhook`, { params: { drop_pending_updates: true } });
                    resultMessage = `🧹 آپدیت‌های در انتظار حذف شدند:\n${JSON.stringify(response.data, null, 2)}`;
                } else {
                    resultMessage = 'دستور نامعتبر است.';
                }

                await answerCallbackQuery(update.callback_query.id);
                await editMessageText(chatId, messageId, resultMessage);

                delete userStates[chatId];

            } catch (error) {
                const errorMessage = parseErrorToFarsi(error);
                await sendMessage(chatId, errorMessage);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('خطای کلی:', error);
        res.sendStatus(500);
    }
});

// ارسال پیام
async function sendMessage(chatId, text, keyboard) {
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    } catch (error) {
        console.error('خطا در sendMessage:', error);
    }
}

// پاسخ به CallbackQuery
async function answerCallbackQuery(callbackQueryId) {
    try {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: callbackQueryId
        });
    } catch (error) {
        console.error('خطا در answerCallbackQuery:', error);
    }
}

// ویرایش متن پیام
async function editMessageText(chatId, messageId, text) {
    try {
        await axios.post(`${TELEGRAM_API}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('خطا در editMessageText:', error);
    }
}

// تبدیل خطا به پیام فارسی
function parseErrorToFarsi(error) {
    let errorMessage = '❌ یک خطا رخ داد.';
    if (error.response) {
        errorMessage += `\nکد وضعیت: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data && error.response.data.description) {
            errorMessage += `\nپیام: ${error.response.data.description}`;
        } else {
            errorMessage += `\nجزئیات: ${JSON.stringify(error.response.data, null, 2)}`;
        }
    } else if (error.request) {
        errorMessage += '\nدرخواست ارسال شد اما پاسخی از سرور دریافت نشد. لطفاً اتصال یا وبهوک را بررسی کنید.';
    } else {
        errorMessage += `\nجزئیات: ${error.message}`;
    }
    return errorMessage;
}

// شروع سرور
app.listen(PORT, () => {
    console.log(`Telegram Webhook Manager Bot running on port ${PORT}`);
});
