
const { Telegraf } = require('telegraf');
const fs = require('fs');
const schedule = require('node-schedule');
const { Parser } = require('json2csv');

const token = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const adminId = 6686188145;
const usersFile = 'users.json';
const logFile = 'log.txt';

const bot = new Telegraf(token);

let users = {};
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
}

function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Command: /start
bot.start(ctx => {
  const id = ctx.from.id;
  const ref = ctx.message.text.split(' ')[1];
  if (!users[id]) {
    users[id] = {
      id,
      username: ctx.from.username,
      tasks: { wallet: '', proofs: false },
      filleuls: [],
      parrain: ref || null,
      totalMBOA: 0
    };
    if (ref && users[ref] && ref !== String(id)) {
      users[ref].filleuls.push(id);
    }
    saveUsers();
  }
  ctx.reply('👋 Bienvenue sur le Airdrop MBOA COIN ! Utilise /taches pour voir les étapes.');
});

// Command: /wallet
bot.command('wallet', ctx => {
  const id = ctx.from.id;
  const message = ctx.message.text.split(' ')[1];
  if (message && /^0x[a-fA-F0-9]{40}$/.test(message)) {
    users[id].tasks.wallet = message;
    saveUsers();
    ctx.reply('✅ Adresse BEP20 enregistrée !');
  } else {
    ctx.reply('❌ Adresse invalide. Format attendu : 0x...');
  }
});

// Command: /proofs
bot.command('proofs', ctx => {
  ctx.reply('📸 Envoie tes captures Twitter, Telegram, Facebook, Instagram ici. Je vais les stocker.');
});

bot.on('photo', ctx => {
  const id = ctx.from.id;
  if (!users[id]) return;
  users[id].tasks.proofs = true;
  saveUsers();
  ctx.reply('✅ Captures enregistrées.');
});

// Command: /taches
bot.command('taches', ctx => {
  ctx.reply(`📝 Étapes à compléter :
1. Ajouter une adresse BEP20 (/wallet)
2. Suivre nos réseaux et envoyer les preuves (/proofs)
3. Rejoins notre groupe Telegram : https://t.me/...
4. Découvre notre offre Ambassadeur : [Devenir Ambassadeur](https://airdrop.mboacoin.com/membrefondateur)
`);
});

// Command: /status
bot.command('status', ctx => {
  const user = users[ctx.from.id];
  if (!user) return ctx.reply('Utilisateur non trouvé.');
  const t = user.tasks;
  ctx.reply(`📊 Ton statut :
- Wallet : ${t.wallet ? '✅' : '⛔'}
- Preuves : ${t.proofs ? '✅' : '⛔'}
- Filleuls validés : ${user.filleuls.filter(f => users[f]?.tasks?.proofs).length}
- Total MBOA : ${user.totalMBOA}`);
});

// Command: /mesfilleuls
bot.command('mesfilleuls', ctx => {
  const user = users[ctx.from.id];
  if (!user?.filleuls?.length) return ctx.reply('Aucun filleul trouvé.');
  let text = '👥 Tes filleuls :\n';
  user.filleuls.forEach(fid => {
    const filleul = users[fid];
    const status = filleul?.tasks?.proofs ? '✅ Validé' : '⛔ Incomplet';
    text += `- @${filleul?.username || fid} – ${status}\n`;
  });
  ctx.reply(text);
});

// Command: /leaderboard
bot.command('leaderboard', ctx => {
  const leaderboard = Object.entries(users)
    .map(([id, user]) => ({
      id,
      username: user.username || `ID:${id}`,
      count: user.filleuls?.filter(fid => users[fid]?.tasks?.proofs).length || 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let text = '🏆 Classement des meilleurs parrains MBOACOIN :\n\n';
  leaderboard.forEach((entry, i) => {
    text += `${i + 1}. @${entry.username} – ${entry.count} filleul(s) validé(s)\n`;
  });

  const currentUser = users[ctx.from.id];
  const myCount = currentUser?.filleuls?.filter(fid => users[fid]?.tasks?.proofs).length || 0;

  const myRank = leaderboard.findIndex(entry => entry.id === String(ctx.from.id));
  if (myRank === -1) {
    text += `\n👤 Tu n’es pas encore dans le Top 10, mais tu as ${myCount} filleul(s) validé(s). Continue de partager ton lien ! 🚀`;
  } else {
    text += `\n🥳 Tu es actuellement #${myRank + 1} avec ${myCount} filleul(s) validé(s) !`;
  }

  ctx.reply(text);
});

// Command: /parrainage
bot.command('parrainage', ctx => {
  ctx.reply(`🔗 Voici ton lien de parrainage :
https://t.me/MboaCoinAirdropBot?start=${ctx.from.id}`);
});

// Command: /export
bot.command('export', ctx => {
  if (ctx.from.id !== adminId) return;
  const fields = ['id', 'username', 'tasks.wallet', 'tasks.proofs', 'filleuls.length', 'totalMBOA'];
  const parser = new Parser({ fields });
  const csv = parser.parse(Object.values(users).map(u => ({
    id: u.id,
    username: u.username,
    'tasks.wallet': u.tasks.wallet,
    'tasks.proofs': u.tasks.proofs,
    'filleuls.length': u.filleuls.length,
    totalMBOA: u.totalMBOA
  })));
  const fileName = `export_${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(fileName, csv);
  ctx.replyWithDocument({ source: fileName, filename: fileName });
});

// Récompense automatique filleul
function notifyReferrer(filleulId) {
  const filleul = users[filleulId];
  const parrainId = filleul?.parrain;
  if (!parrainId || !users[parrainId]) return;
  const parrain = users[parrainId];
  if (!parrain.notifiedFilleuls) parrain.notifiedFilleuls = [];
  if (!parrain.notifiedFilleuls.includes(filleulId) && filleul.tasks?.proofs) {
    parrain.totalMBOA += 50;
    parrain.notifiedFilleuls.push(filleulId);
    bot.telegram.sendMessage(parrainId, `🎉 Ton filleul @${filleul.username} a complété toutes les étapes ! Tu viens de gagner 50 MBOA.`);
    saveUsers();
  }
}

// Vérification quotidienne
setInterval(() => {
  Object.keys(users).forEach(id => notifyReferrer(id));
}, 60 * 60 * 1000); // chaque heure

// Export automatique chaque samedi à 18h
schedule.scheduleJob('0 18 * * 6', () => {
  const fields = ['id', 'username', 'tasks.wallet', 'tasks.proofs', 'filleuls.length', 'totalMBOA'];
  const parser = new Parser({ fields });
  const csv = parser.parse(Object.values(users).map(u => ({
    id: u.id,
    username: u.username,
    'tasks.wallet': u.tasks.wallet,
    'tasks.proofs': u.tasks.proofs,
    'filleuls.length': u.filleuls.length,
    totalMBOA: u.totalMBOA
  })));
  const fileName = `export_auto.csv`;
  fs.writeFileSync(fileName, csv);
  bot.telegram.sendDocument(adminId, { source: fileName, filename: fileName });
});

bot.launch();
