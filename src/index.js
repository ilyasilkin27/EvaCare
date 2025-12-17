import 'dotenv/config';
import { Bot, Keyboard, InlineKeyboard } from 'grammy';
import { readData, writeData, createId } from './storage.js';
import { scheduleDaily, cancel } from './cronManager.js';

const TOKEN = process.env.BOT_TOKEN;
const USER_ID = process.env.USER_ID ? Number(process.env.USER_ID) : null;
const DATA_FILE = process.env.DATA_FILE || './data.json';

if (!TOKEN) {
  console.error('BOT_TOKEN is required in env');
  process.exit(1);
}
if (!USER_ID) {
  console.error('USER_ID is required in env');
  process.exit(1);
}

const bot = new Bot(TOKEN);
const sessions = new Map();

const isUser = (ctx) => {
  const sender = ctx.from?.id ?? ctx.callbackQuery?.from?.id;
  return sender === USER_ID;
};

const mainKeyboard = new Keyboard().text('➕ Добавить таблетку').text('📋 Мои таблетки').row();
const mainMenuText = () => '💊 *EvaCare*\nНапоминалка активна\nЧто делаем?';

const sendReminderMessage = async (item) => {
  await bot.api.sendMessage(USER_ID, `💊 Пора пить\n*${item.name}*`, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text('✅ Выпила', `took:${item.id}`).row().text('⏰ Напомнить через 10 минут', `later:${item.id}`)
  });
};

const loadAndSchedule = async () => {
  const data = await readData(DATA_FILE);
  if (data.userId && data.userId !== USER_ID) {
    data.userId = USER_ID;
    data.tablets = [];
    await writeData(DATA_FILE, data);
    return data;
  }
  if (!data.userId) data.userId = USER_ID;
  data.tablets.forEach((tablet) => {
    if (tablet.active) scheduleDaily(tablet.id, tablet.time, async () => {
      try {
        await sendReminderMessage(tablet);
      } catch (err) {
        console.error('Failed to send reminder', err);
      }
    });
  });
  await writeData(DATA_FILE, data);
  return data;
};

bot.use(async (ctx, next) => {
  if (!isUser(ctx)) return;
  return next();
});

bot.command('start', async (ctx) => ctx.reply(mainMenuText(), { reply_markup: mainKeyboard, parse_mode: 'Markdown' }));

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions.get(userId);
  const text = ctx.message.text;

  if (text === '➕ Добавить таблетку') {
    sessions.set(userId, { step: 'ask_name', tmp: {} });
    await ctx.reply('Как называется таблетка?');
    return;
  }

  if (text === '📋 Мои таблетки') {
    const data = await readData(DATA_FILE);
    if (!data.tablets.length) {
      await ctx.reply('Список пуст.');
      return;
    }
    const keyboard = new InlineKeyboard();
    data.tablets.forEach((t) => keyboard.text(`💊 ${t.name} — ${t.time}`, `show:${t.id}`).row());
    await ctx.reply('📋 *Мои таблетки*', { parse_mode: 'Markdown', reply_markup: keyboard });
    return;
  }

  if (session?.step === 'ask_name') {
    session.tmp.name = text.trim();
    session.step = 'ask_time';
    sessions.set(userId, session);
    await ctx.reply('Во сколько напоминать?\n(формат HH:MM)');
    return;
  }

  if (session?.step === 'ask_time') {
    const val = text.trim();
    if (!/^\d{1,2}:\d{2}$/.test(val)) {
      await ctx.reply('Неверный формат. Используй HH:MM');
      return;
    }
    const [hh, mm] = val.split(':').map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      await ctx.reply('Неверное время. Попробуй ещё.');
      return;
    }
    session.tmp.time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    session.step = 'confirm';
    sessions.set(userId, session);
    const keyboard = new InlineKeyboard().text('✅ Сохранить', 'save').text('❌ Отмена', 'cancel');
    await ctx.reply(`Таблетка: ${session.tmp.name}\nВремя: ${session.tmp.time}`, { reply_markup: keyboard });
    return;
  }

  await ctx.reply(mainMenuText(), { reply_markup: mainKeyboard, parse_mode: 'Markdown' });
});

bot.on('callback_query:data', async (ctx) => {
  const payload = ctx.callbackQuery.data;
  const userId = ctx.callbackQuery.from.id;
  const session = sessions.get(userId);

  if (payload === 'save' && session?.step === 'confirm') {
    const stored = await readData(DATA_FILE);
    const id = createId();
    const item = { id, name: session.tmp.name, time: session.tmp.time, active: true };
    stored.userId = USER_ID;
    stored.tablets.push(item);
    await writeData(DATA_FILE, stored);
    scheduleDaily(id, item.time, async () => {
      try {
        await sendReminderMessage(item);
      } catch (err) {
        console.error('Failed to send reminder', err);
      }
    });
    sessions.delete(userId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Готово. Я напомню 💙');
    return;
  }

  if (payload === 'cancel' && session) {
    sessions.delete(userId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Отменено');
    return;
  }

  if (payload.startsWith('show:')) {
    const id = payload.split(':')[1];
    const stored = await readData(DATA_FILE);
    const found = stored.tablets.find((x) => x.id === id);
    if (!found) {
      await ctx.answerCallbackQuery({ text: 'Не найдено' });
      return;
    }
    const kb = new InlineKeyboard().text('❌ Удалить', `del:${found.id}`);
    await ctx.editMessageText(`💊 ${found.name} — ${found.time}`, { reply_markup: kb });
    await ctx.answerCallbackQuery();
    return;
  }

  if (payload.startsWith('del:')) {
    const id = payload.split(':')[1];
    const stored = await readData(DATA_FILE);
    const idx = stored.tablets.findIndex((x) => x.id === id);
    if (idx === -1) {
      await ctx.answerCallbackQuery({ text: 'Не найдено' });
      return;
    }
    const [removed] = stored.tablets.splice(idx, 1);
    await writeData(DATA_FILE, stored);
    cancel(removed.id);
    await ctx.editMessageText('Удалено');
    await ctx.answerCallbackQuery();
    return;
  }

  if (payload.startsWith('took:')) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Молодец 💙');
    return;
  }

  if (payload.startsWith('later:')) {
    const id = payload.split(':')[1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Напомню через 10 минут');
    setTimeout(async () => {
      const stored = await readData(DATA_FILE);
      const found = stored.tablets.find((x) => x.id === id);
      if (!found) return;
      try {
        await sendReminderMessage(found);
      } catch (err) {
        console.error('Failed to send later reminder', err);
      }
    }, 10 * 60 * 1000);
    return;
  }

  await ctx.answerCallbackQuery();
});

await loadAndSchedule();

bot.start({ onStart: () => console.log('Bot started') });
