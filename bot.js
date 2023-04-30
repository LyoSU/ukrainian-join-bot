const { Bot, GrammyError, HttpError } = require('grammy')

const bot = new Bot(process.env.BOT_TOKEN)

function escapeHTMLEntities (text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

bot.catch(async (err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`)
  const e = err.error
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description)
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e)
  } else {
    console.error('Unknown error:', e)
  }

  try {
    await ctx.reply('Ой, щось пішло не так 😔\nСпробуйте ще раз або зверніться до адміністратора.')
  } catch (err) {
    console.error('Error while replying:', err)
  }
})

// logger middleware
bot.use(async (ctx, next) => {
  const start = new Date()

  console.log('Update:', ctx.update)

  await next()

  const ms = new Date() - start
  console.log('Response time: %sms', ms)
})

// chat join request handler
bot.on('chat_join_request', async (ctx) => {
  // approve only if user's language is Ukrainian
  if (ctx.update.chat_join_request.from.language_code === 'uk') {
    await ctx.approveChatJoinRequest(ctx.update.chat_join_request.from.id)
  } else {
    await ctx.api.sendMessage(ctx.update.chat_join_request.from.id, `Вітаю, ${escapeHTMLEntities(ctx.update.chat_join_request.from.first_name)}!\nЯ приймаю заявки лише від україномовних користувачів.`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🇺🇦 Українізувати Telegram',
              url: 'https://t.me/setlanguage/uk'
            }
          ], [
            {
              text: '+ Долучитись до чату',
              callback_data: `join_chat:${ctx.update.chat_join_request.chat.id}`
            }
          ]
        ]
      }
    }).catch((err) => {
      if (err.description.includes('bot was blocked by the user')) {
        console.log(`User ${ctx.update.chat_join_request.from.id} blocked the bot`)
      } else {
        console.error(err)
        ctx.reply('Вибачте, сталася помилка 😔')
      }
    })
  }
})

bot.callbackQuery(/^join_chat:(.*)$/, async (ctx) => {
  // if uk language, then approve
  if (ctx.from.language_code === 'uk') {
    const chat = await ctx.api.getChat(parseInt(ctx.match[1]))

    await ctx.api.approveChatJoinRequest(parseInt(ctx.match[1]), ctx.from.id).catch((err) => {
      if (err.description.includes('USER_ALREADY_PARTICIPANT')) {
        return ctx.answerCallbackQuery({
          text: `Ви вже є учасником чату «${escapeHTMLEntities(chat.title)}» 🤗`,
          show_alert: true
        })
      } else {
        return ctx.answerCallbackQuery({
          text: 'Вибачте, сталася помилка 😔',
          show_alert: true
        })
      }
    })
    await ctx.answerCallbackQuery({
      text: `Дякуюємо, вас додано до чату «${escapeHTMLEntities(chat.title)}» 🤗`,
      show_alert: true
    })
  } else {
    await ctx.answerCallbackQuery({
      text: 'Вибачте, але ви не можете долучитись до чату, оскільки ваша мова не українська 😔',
      show_alert: true
    })
  }
})

// only private chats
bot.command('start', async (ctx, next) => {
  if (ctx.chat.type !== 'private') return next()

  await ctx.reply(`Вітаю, ${escapeHTMLEntities(ctx.from.first_name)}!\nЯ приймаю заявки лише від україномовних користувачів.\nДодайте мене в групу і надайте права адміністратора, щоб я міг працювати.`, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Додати в групу',
            url: `https://t.me/${ctx.me.username}?startgroup=true&admin=invite_users`
          }
        ]
      ]
    }
  })
})

bot.start()
