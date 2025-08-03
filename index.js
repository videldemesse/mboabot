// index.js
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const { writeToPath } = require('fast-csv');
const bot = new Telegraf('8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y');
const adminId = '6686188145';

let users = {};
try {
  users = JSON.parse(fs.readFileSync('users.json'));
} catch (e) {
  console.error('No users file found or JSON malformed');
}

const saveUsers = () => {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
};

const steps = [
  'joinTelegram',
  'facebookProof',
  'instagramProof',
  'twitterProof',
  'walletAddress',
];

const getUser = (id) => {
  if (!users[id]) {
    users[id] = {
      id,
      stepIndex: 0,
      completedSteps: [],
      proofs: {},
      referredBy: null,
      referrals: [],
      rewards: 0,
    };
  }
  return users[id];
};

const nextStepPrompt = {
  joinTelegram: `🔗 Étape 1 : Rejoins notre canal Telegram : https://t.me/+q5siBqhkQCFiNDcx\n\nMerci de cliquer sur "Fait" une fois que tu as rejoint.`,
  facebookProof: '📸 Étape 2 : Envoie une capture de ton partage Facebook.',
  instagramProof: '📸 Étape 3 : Envoie ton pseudo Instagram.',
  twitterProof: '📸 Étape 4 : Envoie une capture de ton tweet.',
  walletAddress: '💼 Étape 5 : Envoie ton adresse BEP20 (TrustWallet, Metamask, etc.)',
};

const rewardPerStep = 50;

const sendNextStep = async (ctx, user) => {
  const step = steps[user.stepIndex];
  if (!step) {
    // All steps completed
    user.rewards = steps.length * rewardPerStep;
    const referralLink = `https://t.me/MboaCoinAirdropBot?start=${ctx.from.id}`;
    await ctx.reply(`🎉 Félicitations ! Tu as terminé toutes les étapes.\n\nVoici ton lien de parrainage : ${referralLink}`);
    await ctx.reply('👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA !',
      Markup.inlineKeyboard([
        [Markup.button.url('🔥 Recevoir l\'offre', 'https://t.me/+q5siBqhkQCFiNDcx')],
        [Markup.button.callback('❌ Décliner l\'offre', 'decline_offer')],
      ])
    );
    saveUsers();
    return;
  }
  await ctx.reply(nextStepPrompt[step],
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Fait', 'done_step')],
    ])
  );
};

bot.start(async (ctx) => {
  const user = getUser(ctx.from.id);
  if (ctx.message.text.includes('/start ') && !user.referredBy) {
    const ref = ctx.message.text.split(' ')[1];
    if (ref !== ctx.from.id.toString()) user.referredBy = ref;
  }
  await ctx.reply('👋 Bienvenue sur le Airdrop MBOACOIN !');
  await sendNextStep(ctx, user);
});

bot.action('done_step', async (ctx) => {
  const user = getUser(ctx.from.id);
  const currentStep = steps[user.stepIndex];
  if (!user.completedSteps.includes(currentStep)) {
    user.completedSteps.push(currentStep);
  }
  user.stepIndex++;
  saveUsers();
  await sendNextStep(ctx, user);

  // Check if fully complete to notify referrer
  if (user.stepIndex === steps.length && user.referredBy) {
    const refUser = getUser(user.referredBy);
    if (!refUser.referrals.includes(user.id)) {
      refUser.referrals.push(user.id);
      refUser.rewards += 50;
      try {
        await bot.telegram.sendMessage(refUser.id, `🎉 Ton filleul ${ctx.from.first_name} vient de compléter toutes les étapes ! Tu gagnes 50 MBOA supplémentaires !`);
      } catch (e) {
        console.error('Erreur de notification parrain :', e.message);
      }
    }
  }
});

bot.command('status', (ctx) => {
  const user = getUser(ctx.from.id);
  const currentStep = steps[user.stepIndex] || 'Complété ✅';
  ctx.reply(`📍 Étape en cours : ${currentStep}\n✅ Étapes complétées : ${user.completedSteps.length}/${steps.length}`);
});

bot.command('mesfilleuls', (ctx) => {
  const user = getUser(ctx.from.id);
  const valid = user.referrals.length;
  ctx.reply(`👥 Tu as ${valid} filleuls validés.\n💰 Tu as gagné ${user.rewards} MBOA.`);
});

bot.command('top10', (ctx) => {
  const leaderboard = Object.values(users)
    .sort((a, b) => b.referrals.length - a.referrals.length)
    .slice(0, 10)
    .map((u, i) => `#${i + 1} - ${u.id} : ${u.referrals.length} filleuls`)
    .join('\n');
  ctx.reply('🏆 Top 10 des parrains :\n' + leaderboard);
});

bot.command('broadcast', async (ctx) => {
  if (ctx.from.id.toString() !== adminId) return;
  const text = ctx.message.text.replace('/broadcast', '').trim();
  if (!text) return ctx.reply('Veuillez inclure un message après /broadcast');
  for (const uid of Object.keys(users)) {
    try {
      await bot.telegram.sendMessage(uid, `📢 Annonce :\n${text}`);
    } catch (e) {
      console.error('Échec d\'envoi à', uid);
    }
  }
  ctx.reply('✅ Message envoyé à tous les utilisateurs.');
});

bot.command('export', (ctx) => {
  if (ctx.from.id.toString() !== adminId) return;
  const rows = Object.values(users).map((u) => ({
    ID: u.id,
    ReferredBy: u.referredBy || '',
    Referrals: u.referrals.length,
    Rewards: u.rewards,
    StepsDone: u.completedSteps.length,
  }));
  const filePath = 'export.csv';
  writeToPath(filePath, rows, { headers: true })
    .on('finish', () => {
      ctx.replyWithDocument({ source: filePath });
    });
});

bot.action('decline_offer', async (ctx) => {
  await ctx.answerCbQuery('Tu as décliné l\'offre. À bientôt !');
});

bot.launch();

process.on('SIGINT', () => bot.stop('SIGINT'));
process.on('SIGTERM', () => bot.stop('SIGTERM'));
