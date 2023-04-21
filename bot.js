const { Bot, GrammyError, HttpError } = require('grammy')

const bot = new Bot(process.env.BOT_TOKEN)

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
  }
})

// only private chats
bot.command('start', async (ctx, next) => {
  if (ctx.chat.type !== 'private') return next()

  await ctx.reply(`Вітаю, ${ctx.from.first_name}!\nЯ приймаю заявки лише від україномовних користувачів.\nДодайте мене в групу і надайте права адміністратора, щоб я міг працювати.`, {
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
