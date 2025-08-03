// index.js complet - MBOACOIN AIRDROP BOT (v3)

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const { Parser } = require('json2csv');

const BOT_TOKEN = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const ADMIN_ID = 6686188145;
const CHANNEL_LINK = 'https://t.me/+q5siBqhkQCFiNDcx';

const bot = new Telegraf(BOT_TOKEN);
const DATA_FILE = 'users.json';

let users = {};
if (fs.existsSync(DATA_FILE)) {
  users = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveUsers() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function createNewUser(user, ref) {
  return {
    username: `@${user.username || user.first_name}`,
    wallet: '',
    ref: ref || '',
    tasks: {
      telegram: false,
      facebook: false,
      instagram: false,
      twitter: false,
      wallet: false,
      proofs: false
    },
    referrals: [],
    totalMBOA: 0
  };
}

function hasCompletedAllTasks(user) {
  const t = user.tasks;
  return t.telegram && t.facebook && t.instagram && t.twitter && t.wallet && t.proofs;
}

function calculateReward(user) {
  let reward = 0;
  const taskValues = {
    telegram: 100,
    facebook: 100,
    instagram: 100,
    twitter: 100,
    wallet: 100,
    proofs: 100
  };
  for (const task in taskValues) {
    if (user.tasks[task]) reward += taskValues[task];
  }
  reward += (user.referrals.filter(r => r.validated).length * 50);
  return reward;
}

function sendCompletionMessage(ctx, id) {
  const refLink = `https://t.me/${ctx.me}?start=${id}`;
  ctx.replyWithMarkdown(`🎉 Félicitations ! Tu as terminé toutes les étapes.\n\nVoici ton lien de parrainage : ${refLink}\n\n👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA !`,
    Markup.inlineKeyboard([
      [Markup.button.url('🔥 Recevoir l\'offre', 'https://airdrop.mboacoin.com/membrefondateur')],
      [Markup.button.callback('❌ Décliner l\'offre', 'decline_offer')]
    ])
  );
}

bot.start((ctx) => {
  const id = ctx.from.id;
  const args = ctx.message.text.split(' ');
  const ref = args[1] || '';

  if (!users[id]) {
    users[id] = createNewUser(ctx.from, ref);

    if (ref && users[ref]) {
      users[ref].referrals.push({ id, validated: false });
    }
    saveUsers();
  }

  const user = users[id];
  if (hasCompletedAllTasks(user)) {
    sendCompletionMessage(ctx, id);
  } else {
    ctx.reply(`👋 Bienvenue sur le Airdrop MBOACOIN !\n\n📲 Étape 1 : Rejoins notre canal Telegram officiel :\n👉 ${CHANNEL_LINK}\n\nUne fois fait, envoie une capture ici.`);
    user.currentStep = 'telegram';
    saveUsers();
  }
});

bot.command('startover', (ctx) => {
  const id = ctx.from.id;
  users[id] = createNewUser(ctx.from);
  saveUsers();
  ctx.reply('🔁 Ton profil a été réinitialisé. Tape /start pour recommencer.');
});

bot.command('export', (ctx) => {
  if (ctx.from.id != ADMIN_ID) return;
  const fields = ['username', 'wallet', 'totalMBOA'];
  const parser = new Parser({ fields });
  const data = Object.values(users).map(u => ({ username: u.username, wallet: u.wallet, totalMBOA: calculateReward(u) }));
  const csv = parser.parse(data);
  fs.writeFileSync('export.csv', csv);
  ctx.replyWithDocument({ source: 'export.csv', filename: 'participants.csv' });
});

bot.command('broadcast', (ctx) => {
  if (ctx.from.id != ADMIN_ID) return ctx.reply('⛔ Commande réservée à l\'admin.');
  const msg = ctx.message.text.replace('/broadcast', '').trim();
  if (!msg) return ctx.reply('⚠️ Utilisation : /broadcast votre message');

  Object.keys(users).forEach(uid => {
    bot.telegram.sendMessage(uid, `📢 Annonce : ${msg}`).catch(() => {});
  });
  ctx.reply('✅ Annonce envoyée.');
});

bot.command('leaderboard', (ctx) => {
  const leaders = Object.entries(users)
    .map(([id, u]) => ({ id, username: u.username, points: calculateReward(u) }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  let msg = '🏆 *Top 10 des parrains :*\n\n';
  leaders.forEach((l, i) => {
    msg += `#${i + 1} - ${l.username} : ${l.points} MBOA\n`;
  });
  ctx.replyWithMarkdown(msg);
});

bot.command('status', (ctx) => {
  const user = users[ctx.from.id];
  if (!user) return ctx.reply('❌ Aucune donnée enregistrée.');
  const reward = calculateReward(user);
  const steps = Object.entries(user.tasks)
    .map(([k, v]) => `${k} : ${v ? '✅' : '⛔'}`).join('\n');
  ctx.replyWithMarkdown(`📊 *Ton statut :*\n\n${steps}\n\nTotal MBOA estimé : *${reward}*`);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
