// index.js

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

// === CONFIG ===
const BOT_TOKEN = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const ADMIN_ID = '6686188145';
const TELEGRAM_CHANNEL_LINK = 'https://t.me/+q5siBqhkQCFiNDcx';
const usersFile = path.join(__dirname, 'users.json');
const csvExportPath = path.join(__dirname, 'participants.csv');

const bot = new Telegraf(BOT_TOKEN);

// === Load/Save User Data ===
let users = {};
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
}
function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getUser(ctx) {
  const id = ctx.from.id;
  if (!users[id]) {
    users[id] = {
      id,
      username: ctx.from.username || '',
      ref: ctx.startPayload || '',
      steps: {},
      filleuls: [],
      totalMBOA: 0,
      completed: false,
      joinedAt: new Date().toISOString(),
    };
    if (users[users[id].ref]) {
      users[users[id].ref].filleuls.push(id);
    }
    saveUsers();
  }
  return users[id];
}

function calculateReward(user) {
  let total = 0;
  if (user.steps.telegram) total += 20;
  if (user.steps.facebook) total += 20;
  if (user.steps.instagram) total += 30;
  if (user.steps.twitter) total += 30;
  if (user.steps.wallet) total += 50;
  return total;
}

function checkCompletion(user) {
  return user.steps.telegram && user.steps.facebook && user.steps.instagram && user.steps.twitter && user.steps.wallet;
}

function getReferralLink(user) {
  return `https://t.me/mboacoinbot?start=${user.id}`;
}

function notifySponsorIfValid(userId) {
  const user = users[userId];
  if (checkCompletion(user)) {
    const sponsorId = user.ref;
    if (sponsorId && users[sponsorId]) {
      users[sponsorId].totalMBOA += 50;
      bot.telegram.sendMessage(sponsorId, `🎉 Ton filleul @${user.username || userId} a terminé toutes les étapes ! +50 MBOA pour toi !`);
    }
  }
}

// === Step Handlers ===
async function sendWelcome(ctx) {
  const user = getUser(ctx);
  await ctx.reply(`👋 Bienvenue sur le Airdrop MBOACOIN !\n\nÉtape 1 : Rejoins notre canal Telegram`,
    Markup.inlineKeyboard([
      [Markup.button.url('📢 Rejoindre le canal', TELEGRAM_CHANNEL_LINK)]
    ])
  );
  await ctx.reply('✅ Une fois terminé, clique ici pour continuer.', Markup.keyboard(['✅ J’ai rejoint Telegram']).oneTime().resize());
}

// === Commands ===
bot.start(async ctx => {
  const user = getUser(ctx);
  if (user.completed) {
    return ctx.reply(`🎉 Tu as déjà terminé toutes les étapes !\n\nVoici ton lien de parrainage : ${getReferralLink(user)}`);
  }
  sendWelcome(ctx);
});

bot.hears('✅ J’ai rejoint Telegram', ctx => {
  const user = getUser(ctx);
  user.steps.telegram = true;
  saveUsers();
  ctx.reply('📘 Étape 2 : Envoie ton pseudo Facebook.');
});

bot.on('text', ctx => {
  const user = getUser(ctx);
  const message = ctx.message.text;
  if (!user.steps.facebook && message.startsWith('@')) {
    user.steps.facebook = message;
    saveUsers();
    return ctx.reply('📸 Étape 3 : Envoie ton pseudo Instagram.');
  }
  if (!user.steps.instagram && message.startsWith('@')) {
    user.steps.instagram = message;
    saveUsers();
    return ctx.reply('🐦 Étape 4 : Envoie ton pseudo Twitter.');
  }
  if (!user.steps.twitter && message.startsWith('@')) {
    user.steps.twitter = message;
    saveUsers();
    return ctx.reply('💼 Étape 5 : Envoie ton adresse BEP20 (Trust Wallet, Metamask, etc).');
  }
  if (!user.steps.wallet && message.startsWith('0x')) {
    user.steps.wallet = message;
    user.totalMBOA = calculateReward(user);
    user.completed = true;
    saveUsers();
    notifySponsorIfValid(user.id);
    return ctx.reply(`🎉 Félicitations ! Tu as terminé toutes les étapes.\n\nTon lien de parrainage : ${getReferralLink(user)}\n\n👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA !`,
      Markup.inlineKeyboard([
        [Markup.button.url('🔥 Recevoir l'offre', 'https://airdrop.mboacoin.com/membrefondateur')],
        [Markup.button.callback('❌ Décliner l'offre', 'decline_offer')]
      ])
    );
  }
});

bot.command('status', ctx => {
  const user = getUser(ctx);
  ctx.reply(`📊 Ton avancement :\nTelegram : ${user.steps.telegram ? '✅' : '❌'}\nFacebook : ${user.steps.facebook ? '✅' : '❌'}\nInstagram : ${user.steps.instagram ? '✅' : '❌'}\nTwitter : ${user.steps.twitter ? '✅' : '❌'}\nWallet : ${user.steps.wallet ? '✅' : '❌'}\nTotal : ${user.totalMBOA} MBOA`);
});

bot.command('top10', ctx => {
  const leaderboard = Object.values(users)
    .filter(u => u.filleuls && u.filleuls.length > 0)
    .sort((a, b) => b.filleuls.length - a.filleuls.length)
    .slice(0, 10)
    .map((u, i) => `${i + 1}. @${u.username || u.id} - ${u.filleuls.length} filleuls`);
  ctx.reply(`🏆 Top 10 des parrains :\n\n${leaderboard.join('\n')}`);
});

bot.command('mesfilleuls', ctx => {
  const user = getUser(ctx);
  const filleuls = user.filleuls.map(id => {
    const f = users[id];
    return `- @${f.username || id} : ${f.completed ? '✅' : '⏳'}`;
  });
  ctx.reply(`👥 Tes filleuls :\n\n${filleuls.join('\n')}`);
});

bot.command('export', ctx => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const csvWriter = createObjectCsvWriter({
    path: csvExportPath,
    header: [
      { id: 'id', title: 'ID' },
      { id: 'username', title: 'Username' },
      { id: 'totalMBOA', title: 'MBOA' },
      { id: 'ref', title: 'Parrain' },
      { id: 'completed', title: 'Validé' },
      { id: 'joinedAt', title: 'Date' },
    ]
  });
  csvWriter.writeRecords(Object.values(users)).then(() => {
    ctx.replyWithDocument({ source: csvExportPath });
  });
});

bot.command('broadcast', ctx => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  ctx.reply('✍️ Envoie le message à diffuser à tous les utilisateurs :');
  bot.once('text', m => {
    Object.values(users).forEach(u => {
      bot.telegram.sendMessage(u.id, `📢 Annonce :\n\n${m.message.text}`);
    });
    m.reply('✅ Message envoyé à tous.');
  });
});

bot.command('restart', ctx => {
  delete users[ctx.from.id];
  saveUsers();
  ctx.reply('🔄 Parcours réinitialisé. Envoie /start pour recommencer.');
});

// === Start Bot ===
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('🤖 MboaCoin Airdrop Bot lancé.');
