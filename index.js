const { Telegraf } = require('telegraf');
const fs = require('fs');
const schedule = require('node-schedule');
const path = require('path');

const bot = new Telegraf('8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y');
const adminId = 6686188145;
const dataPath = path.join(__dirname, 'users.json');

let users = {};
if (fs.existsSync(dataPath)) {
  users = JSON.parse(fs.readFileSync(dataPath));
}

// Sauvegarde automatique
function saveUsers() {
  fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));
}

// Récompense par étape
const steps = [
  { key: 'telegram', msg: '✅ Étape 1 : Rejoins notre canal Telegram : https://t.me/+BdnXzUlUlc9lZTc0\n\nUne fois fait, tape : `fait`', reward: 100 },
  { key: 'facebook', msg: '✅ Étape 2 : Abonne-toi et interagis à une publication sur notre page Facebook : https://www.facebook.com/profile.php?id=61578396563477\n\nPuis envoie une capture d\'écran.', reward: 150 },
  { key: 'instagram', msg: '✅ Étape 3 : Abonne-toi à notre Instagram : https://www.instagram.com/mboa_coin/\n\nPuis envoie une capture d\'écran.', reward: 150 },
  { key: 'twitter', msg: '✅ Étape 4 : Abonne-toi et interagis avec un post sur notre Twitter : https://x.com/MboaCoin\n\nPuis envoie une capture d\'écran.', reward: 150 },
  { key: 'wallet', msg: '✅ Étape 5 : Envoie ton adresse BEP20 (BNB Smart Chain).', reward: 200 }
];

// Fonction pour envoyer l'étape suivante
function sendNextStep(ctx) {
  const user = users[ctx.from.id];
  const next = steps.find(step => !user.steps[step.key]);
  if (next) {
    ctx.reply(next.msg);
  } else {
    const link = `https://airdrop.mboacoin.com/membrefondateur?ref=${ctx.from.id}`;
    ctx.reply(`🎉 Félicitations ! Tu as terminé toutes les étapes.\n\nVoici ton lien de parrainage : ${link}\n\n👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA !`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔥 Recevoir l'offre", url: link }],
          [{ text: "❌ Décliner l'offre", callback_data: 'decline_offer' }]
        ]
      }
    });
  }
}

// Commande /start
bot.start(ctx => {
  const userId = ctx.from.id;
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      username: ctx.from.username || '',
      steps: {},
      rewards: 0,
      referrals: [],
      wallet: '',
      affiliate: '',
      invited_by: ''
    };
  }
  ctx.reply("👋 Bienvenue sur le Airdrop MBOACOIN !");
  saveUsers();
  sendNextStep(ctx);
});

// Gestion des messages utilisateur
bot.on('text', ctx => {
  const userId = ctx.from.id;
  const user = users[userId];

  if (!user) return ctx.reply("Erreur interne. Tape /start pour recommencer.");

  const currentStep = steps.find(step => !user.steps[step.key]);
  if (!currentStep) return;

  if (currentStep.key === 'telegram' && ctx.message.text.toLowerCase().includes('fait')) {
    user.steps.telegram = true;
    user.rewards += currentStep.reward;
    ctx.reply(`✅ Étape validée. Tu as gagné ${currentStep.reward} MBOA.`);
    saveUsers();
    return sendNextStep(ctx);
  }

  if (currentStep.key === 'wallet' && ctx.message.text.startsWith('0x')) {
    user.wallet = ctx.message.text;
    user.steps.wallet = true;
    user.rewards += currentStep.reward;
    ctx.reply(`✅ Adresse BEP20 reçue. ${currentStep.reward} MBOA ajoutés.`);
    saveUsers();
    return sendNextStep(ctx);
  }

  ctx.reply("Merci ! Veuillez patienter pendant que nous validons votre soumission.");
});

// Gestion des captures
bot.on('photo', ctx => {
  const userId = ctx.from.id;
  const user = users[userId];
  if (!user) return;

  const currentStep = steps.find(step => !user.steps[step.key]);
  if (!currentStep || ['facebook', 'instagram', 'twitter'].indexOf(currentStep.key) === -1) return;

  user.steps[currentStep.key] = true;
  user.rewards += currentStep.reward;
  ctx.reply(`✅ Capture reçue. Tu gagnes ${currentStep.reward} MBOA.`);
  saveUsers();
  sendNextStep(ctx);
});

// Commande /status
bot.command('status', ctx => {
  const user = users[ctx.from.id];
  if (!user) return ctx.reply("Aucune donnée. Tape /start pour commencer.");
  ctx.reply(`📊 Ton statut :\n\nÉtapes complétées : ${Object.keys(user.steps).length}/${steps.length}\nTotal MBOA : ${user.rewards}`);
});

// Commande /mesfilleuls
bot.command('mesfilleuls', ctx => {
  const user = users[ctx.from.id];
  if (!user) return ctx.reply("Aucun filleul trouvé.");
  const filleuls = user.referrals.map(id => users[id]?.steps).filter(f => f && Object.keys(f).length === steps.length).length;
  ctx.reply(`👥 Tu as ${filleuls} filleuls validés.`);
});

// Admin: /export
bot.command('export', ctx => {
  if (ctx.from.id != adminId) return;
  const csv = Object.values(users).map(u =>
    [u.id, u.username, u.wallet, u.rewards, Object.keys(u.steps).length, u.referrals.length].join(',')
  ).join('\n');
  fs.writeFileSync('export.csv', csv);
  ctx.reply("✅ Export CSV généré.");
});

// Schedule export auto samedi à 18h
schedule.scheduleJob('0 18 * * 6', () => {
  const csv = Object.values(users).map(u =>
    [u.id, u.username, u.wallet, u.rewards, Object.keys(u.steps).length, u.referrals.length].join(',')
  ).join('\n');
  fs.writeFileSync('export.csv', csv);
});

bot.launch().then(() => console.log("✅ MboaBot lancé."));
