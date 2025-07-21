// 📌 Telegram Webhook Manager Bot (نسخه با دکمه‌های کیبورد اصلی و حفظ وضعیت کاربر)

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
                await sendMessage(chatId, `سلام ${userName} 🌷\nلطفاً Bot Token رباتی که می‌خواهید مدیریت کنید را ارسال کنید.`, mainKeyboard());
                return res.sendStatus(200);
            }

            if (!userStates[chatId]) {
                await sendMessage(chatId, `سلام ${userName} 🌷\nبرای شروع دستور /start را ارسال کنید.`, mainKeyboard());
                return res.sendStatus(200);
            }

            const userState = userStates[chatId];

            if (text === '❌ پایان عملیات') {
                delete userStates[chatId];
                await sendMessage(chatId, '✅ داده‌های شما پاک شد. برای شروع مجدد /start را ارسال کنید.', mainKeyboard());
                return res.sendStatus(200);
            }

            if (text === '✅ ست کردن وبهوک') {
                if (userState.botToken && userState.webhookUrl) {
                    try {
                        const response = await axios.get(`https://api.telegram.org/bot${userState.botToken}/setWebhook`, { params: { url: userState.webhookUrl } });
                        await sendMessage(chatId, `✅ نتیجه ست کردن وبهوک:\n${JSON.stringify(response.data, null, 2)}`, mainKeyboard());
                    } catch (error) {
                        await sendMessage(chatId, parseErrorToFarsi(error), mainKeyboard());
                    }
                } else {
                    await sendMessage(chatId, '❌ لطفاً ابتدا Bot Token و Webhook URL خود را ارسال کنید.', mainKeyboard());
                }
                return res.sendStatus(200);
            }

            if (text === '🗑️ حذف وبهوک') {
                if (userState.botToken) {
                    try {
                        const response = await axios.get(`https://api.telegram.org/bot${userState.botToken}/deleteWebhook`);
                        await sendMessage(chatId, `🗑️ وبهوک حذف شد:\n${JSON.stringify(response.data, null, 2)}`, mainKeyboard());
                    } catch (error) {
                        await sendMessage(chatId, parseErrorToFarsi(error), mainKeyboard());
                    }
                } else {
                    await sendMessage(chatId, '❌ لطفاً ابتدا Bot Token خود را ارسال کنید.', mainKeyboard());
                }
                return res.sendStatus(200);
            }

            if (text === '📊 نمایش آپدیت‌های در انتظار') {
                if (userState.botToken) {
                    try {
                        const response = await axios.get(`https://api.telegram.org/bot${userState.botToken}/getUpdates`);
                        await sendMessage(chatId, `📊 تعداد آپدیت‌های در انتظار: ${response.data.result.length}`, mainKeyboard());
                    } catch (error) {
                        await sendMessage(chatId, parseErrorToFarsi(error), mainKeyboard());
                    }
                } else {
                    await sendMessage(chatId, '❌ لطفاً ابتدا Bot Token خود را ارسال کنید.', mainKeyboard());
                }
                return res.sendStatus(200);
            }

            if (text === '🧹 حذف آپدیت‌های در انتظار') {
                if (userState.botToken) {
                    try {
                        const response = await axios.get(`https://api.telegram.org/bot${userState.botToken}/deleteWebhook`, { params: { drop_pending_updates: true } });
                        await sendMessage(chatId, `🧹 آپدیت‌های در انتظار حذف شدند:\n${JSON.stringify(response.data, null, 2)}`, mainKeyboard());
                    } catch (error) {
                        await sendMessage(chatId, parseErrorToFarsi(error), mainKeyboard());
                    }
                } else {
                    await sendMessage(chatId, '❌ لطفاً ابتدا Bot Token خود را ارسال کنید.', mainKeyboard());
                }
                return res.sendStatus(200);
            }

            if (text === 'ℹ️ نمایش اطلاعات وبهوک') {
                if (userState.botToken) {
                    try {
                        const response = await axios.get(`https://api.telegram.org/bot${userState.botToken}/getWebhookInfo`);
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
                        await sendMessage(chatId, formattedInfo, mainKeyboard());
                    } catch (error) {
                        await sendMessage(chatId, parseErrorToFarsi(error), mainKeyboard());
                    }
                } else {
                    await sendMessage(chatId, '❌ لطفاً ابتدا Bot Token خود را ارسال کنید.', mainKeyboard());
                }
                return res.sendStatus(200);
            }

            if (userState.step === 'awaiting_bot_token') {
                userState.botToken = text.trim();
                userState.step = 'awaiting_webhook_url';
                await sendMessage(chatId, 'لطفاً Webhook URL خود را ارسال کنید:', mainKeyboard());
            } else if (userState.step === 'awaiting_webhook_url') {
                userState.webhookUrl = text.trim();

                if (!userState.webhookUrl.startsWith('https://')) {
                    await sendMessage(chatId, '❌ لینک وبهوک باید با https شروع شود. لطفاً یک لینک معتبر ارسال کنید.', mainKeyboard());
                    return res.sendStatus(200);
                }

                userState.step = 'ready';
                await sendMessage(chatId, '✅ اطلاعات ذخیره شد. اکنون می‌توانید عملیات مورد نظر خود را از منوی زیر انتخاب کنید.', mainKeyboard());
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

// کیبورد اصلی با تمام عملیات و دکمه پایان عملیات
function mainKeyboard() {
    return {
        keyboard: [
            [{ text: '✅ ست کردن وبهوک' }, { text: '🗑️ حذف وبهوک' }],
            [{ text: '📊 نمایش آپدیت‌های در انتظار' }, { text: '🧹 حذف آپدیت‌های در انتظار' }],
            [{ text: 'ℹ️ نمایش اطلاعات وبهوک' }],
            [{ text: '❌ پایان عملیات' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
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
