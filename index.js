// MboaCoin Airdrop Bot - Version Finale Complète (liens réseaux corrigés)
// Inclus : étapes 1-5, quiz 3 questions, attribution MBOA, parrainage, commandes, notifications, export hebdo

const TelegramBot = require('node-telegram-bot-api');
const fs          = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const cron        = require('node-cron');

// === CONFIGURATION ===
const token    = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const adminId  = 6686188145;
const dataFile = './users.json';

// === INITIALISATION ===
const bot   = new TelegramBot(token, { polling: true });
let users   = {};
if (fs.existsSync(dataFile)) {
  users = JSON.parse(fs.readFileSync(dataFile));
}
function saveUsers() {
  fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
}
function generateReferralLink(userId) {
  return `https://t.me/MboaCoinAirdropBot?start=${userId}`;
}

// Quiz questions
const quizQuestions = [
  {
    text:    "💡 Quelle est la mission de MboaCoin ?",
    options: ["Créer une banque locale", "Faciliter le commerce intra-africain", "Remplacer le Bitcoin"],
    answerIndex: 1
  },
  {
    text:    "🌍 Quel est le symbole du token MboaCoin ?",
    options: ["$MBA", "$MBO", "$MBC"],
    answerIndex: 1
  },
  {
    text:    "📲 Quelle app permet de stocker les MBOA ?",
    options: ["MetaMask", "Trust Wallet", "MboaWallet"],
    answerIndex: 2
  }
];

// === COMMANDES ===
// /start avec parrainage
bot.onText(/\/start(?: (\d+))?/, (msg, match) => {
  const chatId = msg.chat.id.toString(),
        ref    = match[1];
  if (!users[chatId]) {
    users[chatId] = {
      id:       chatId,
      step:     1,
      totalMBOA:0,
      quizCount:0,
      referrals:[],
      referrer: ref && ref !== chatId ? ref : null
    };
    if (users[chatId].referrer) {
      users[ users[chatId].referrer ] = users[users[chatId].referrer] || { referrals: [] };
      users[ users[chatId].referrer ].referrals.push(chatId);
    }
    saveUsers();
  }
  bot.sendMessage(chatId,
    `🎉 Bienvenue dans l'airdrop officiel MboaCoin !\n` +
    `Tu peux gagner 50 MBOA en complétant 5 étapes, puis un quiz. 👇`
  );
  // Étape 1
  bot.sendMessage(chatId,
    `📌 Étape 1 : Rejoins notre canal Telegram 👉 https://t.me/+q5siBqhkQCFiNDcx\n` +
    `Envoie ta capture ici.`
  );
});

// /status
bot.onText(/\/status/, msg => {
  const id = msg.chat.id.toString(),
        u  = users[id];
  if (!u) return bot.sendMessage(id, "Tu n'as pas encore commencé. Tape /start.");
  bot.sendMessage(id,
    `📊 Statut : Étape ${u.step}/7\n` +
    `Total MBOA : ${u.totalMBOA}`
  );
});

// /parrainage
bot.onText(/\/parrainage/, msg => {
  const id = msg.chat.id.toString();
  if (!users[id]) return bot.sendMessage(id, "Commence par /start.");
  bot.sendMessage(id,
    `🔗 Ton lien d'invitation :\n${generateReferralLink(id)}`
  );
});

// /mesfilleuls
bot.onText(/\/mesfilleuls/, msg => {
  const id = msg.chat.id.toString(),
        u  = users[id];
  if (!u || !u.referrals.length) return bot.sendMessage(id, "Aucun filleul enregistré.");
  const list = u.referrals.map(fid => {
    const st = (users[fid] && users[fid].step >= 7) ? '✅' : '⏳';
    return `• ${fid} ${st}`;
  }).join('\n');
  bot.sendMessage(id,
    `👥 Mes filleuls :\n${list}`
  );
});

// /leaderboard
bot.onText(/\/leaderboard/, msg => {
  const arr = Object.values(users)
    .filter(u => u.referrals?.length)
    .sort((a,b) => b.referrals.length - a.referrals.length)
    .slice(0,10)
    .map((u,i) => `${i+1}. ${u.id} - ${u.referrals.length}`);
  bot.sendMessage(msg.chat.id,
    `🏆 Top parrains :\n${arr.join('\n')}`
  );
});

// /export admin
bot.onText(/\/export/, msg => {
  if (msg.from.id !== adminId) return;
  const csv = createObjectCsvWriter({
    path: 'participants.csv',
    header: [
      { id:'id',         title:'ID' },
      { id:'totalMBOA',  title:'MBOA' },
      { id:'step',       title:'Étape' },
      { id:'referrer',   title:'Parrain' }
    ]
  });
  const recs = Object.values(users).map(u => ({
    id: u.id,
    totalMBOA: u.totalMBOA,
    step: u.step,
    referrer: u.referrer||''
  }));
  csv.writeRecords(recs).then(() => bot.sendDocument(msg.chat.id, 'participants.csv'));
});

// /broadcast admin
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== adminId) return;
  const text = match[1];
  Object.keys(users).forEach(id => bot.sendMessage(id, `📢 ${text}`));
  bot.sendMessage(msg.chat.id, 'Message envoyé.');
});

// === AIRDROP STEPS ===
bot.on('photo', msg => {
  const id = msg.chat.id.toString();
  if (!users[id]) return;
  const u = users[id];
  if (u.step >= 1 && u.step <= 4) {
    u.totalMBOA += 10;
    bot.sendMessage(id,
      `✅ Étape ${u.step} validée ! +10 MBOA\n` +
      `Total : ${u.totalMBOA}`
    );
    u.step++;
    saveUsers();
    let prompt;
    switch (u.step) {
      case 2:
        prompt = `📌 Étape 2 : Aime notre page Facebook 👉 https://www.facebook.com/profile.php?id=61578396563477`;
        break;
      case 3:
        prompt = `📌 Étape 3 : Suis-nous sur Instagram 👉 https://www.instagram.com/mboa_coin/`;
        break;
      case 4:
        prompt = `📌 Étape 4 : Suis-nous sur Twitter 👉 https://x.com/MboaCoin`;
        break;
      case 5:
        prompt = `📌 Étape 5 : Envoie ton adresse BEP20 commençant par 0x`;
        break;
    }
    return bot.sendMessage(id, prompt);
  }
});

// Wallet submission
bot.on('message', msg => {
  const id = msg.chat.id.toString();
  if (!users[id]) return;
  const u = users[id];
  if (u.step === 5 && msg.text?.startsWith('0x') && msg.text.length === 42) {
    u.wallet = msg.text.trim();
    u.totalMBOA += 10;
    u.step = 6;
    saveUsers();
    bot.sendMessage(id,
      `✅ Étape wallet validée ! +10 MBOA\n` +
      `Total : ${u.totalMBOA}`
    );
    bot.sendMessage(id,
      `🔍 Avant le quiz, visite notre site 👉 https://www.mboacoin.com`
    );
    const q0 = quizQuestions[0];
    const kb0 = q0.options.map((o,i) => [{ text: o, callback_data: `quiz_0_${i}` }]);
    return bot.sendMessage(id, q0.text, { reply_markup: { inline_keyboard: kb0 } });
  }
});

// Quiz handling
bot.on('callback_query', query => {
  const id = query.from.id.toString();
  if (!users[id]) return;
  const u = users[id];
  const d = query.data;
  if (d.startsWith('quiz_')) {
    const [_, qi, ai] = d.split('_'),
          idx = +qi,
          ans = +ai,
          q = quizQuestions[idx];
    if (ans === q.answerIndex) {
      u.totalMBOA += 10;
      bot.sendMessage(id, '✅ Bonne réponse !');
    } else {
      return bot.sendMessage(id, '❌ Mauvaise réponse. Consulte le site avant de réessayer.');
    }
    if (idx < quizQuestions.length - 1) {
      saveUsers();
      const nq = quizQuestions[idx+1];
      const kb = nq.options.map((o,i) => [{ text: o, callback_data: `quiz_${idx+1}_${i}` }]);
      return bot.sendMessage(id, nq.text, { reply_markup: { inline_keyboard: kb } });
    } else {
      // quiz terminé
      u.step = 7;
      saveUsers();
      bot.sendMessage(id,
        `🎉 Quiz terminé ! +${quizQuestions.length * 10} MBOA (total ${u.totalMBOA})`
      );
      const refLink = generateReferralLink(id);
      bot.sendMessage(id,
        `Le savais-tu ? Tu peux gagner 50 MBOA pour chacun de tes filleuls qui complète l'airdrop de MboaCoin.\n` +
        `Partage ton lien pour inviter tes amis :\n🔗 ${refLink}`
      );
      return bot.sendMessage(id,
        `🎓 Deviens Ambassadeur MboaCoin dès aujourd'hui et reçois **10 000 MBOA de bienvenue** ! Accès VIP, récompenses mensuelles et plus encore t'attendent.`,
        { reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Je veux l'offre", url: "https://airdrop.mboacoin.com/membrefondateur" }],
              [{ text: "❌ Non merci",    callback_data: "decline" }]
            ]
          }
        }
      );
    }
  }
  if (query.data === 'decline') {
    const u2 = users[query.from.id.toString()];
    bot.sendMessage(u2.id,
      `👍 Merci pour ta participation !\n` +
      `Récapitulatif : ${u2.totalMBOA} MBOA gagnés.\n` +
      `Chaque samedi, ton portefeuille sera crédité en MBOA selon tes filleuls validés.\n` +
      `Les 10 meilleurs parrains reçoivent 1000 MBOA chaque semaine.\n` +
      `📊 Tableau de bord à venir.`
    );
  }
});

// notification & export hebdo
cron.schedule('0 18 * * SAT', () => {
  const csvW = createObjectCsvWriter({
    path: 'weekly.csv',
    header: [
      { id:'id',        title:'ID' },
      { id:'totalMBOA', title:'MBOA' },
      { id:'referrer',  title:'Parrain' }
    ]
  });
  const recs = Object.values(users).map(u => ({
    id: u.id,
    totalMBOA: u.totalMBOA,
    referrer: u.referrer || ''
  }));
  csvW.writeRecords(recs).then(() => bot.sendDocument(adminId, 'weekly.csv'));
  Object.values(users).forEach(u => {
    if (u.referrer && users[u.referrer]) {
      bot.sendMessage(u.referrer,
        `🔔 Ton filleul ${u.id} a complété aujourd'hui. +50 MBOA !`
      );
    }
  });
});

console.log('🤖 MboaCoin Airdrop Bot is running...');
