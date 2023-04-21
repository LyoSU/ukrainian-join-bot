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
    let joinLink = 'https://t.me/'
    if (ctx.chat.username) {
      joinLink = `https://t.me/${ctx.chat.username}`
    } else {
      const chatInviteLink = await ctx.api.createChatInviteLink(ctx.chat.id, {
        expire_date: new Date().getTime() / 1000 + 60 * 60, // 1 hour
        creates_join_request: true
      }).catch(() => null)

      if (chatInviteLink?.invite_link) {
        joinLink = chatInviteLink.invite_link
      }
    }

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
              url: joinLink
            }
          ]
        ]
      }
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
