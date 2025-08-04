
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const token = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const adminId = 6686188145;
const bot = new TelegramBot(token, { polling: true });

let users = {};
try {
  users = JSON.parse(fs.readFileSync('users.json'));
} catch {
  users = {};
}

function saveUsers() {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

function getStep(user) {
  return user.step || 0;
}

function setStep(userId, step) {
  users[userId].step = step;
  saveUsers();
}

function generateReferralLink(userId) {
  return `https://t.me/MboaCoinAirdropBot?start=${userId}`;
}

bot.onText(/\/start(?: (\d+))?/, (msg, match) => {
  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  user = users[userId];

  if (!users[userId]) {
    users[userId] = {
      id: userId,
      username: msg.from.username || '',
      proofs: {},
      referrals: [],
      rewards: 0,
      step: 0,
      joinedAt: new Date().toISOString()
    };
  }

  // Enregistrer le parrain
  if (match[1] && !users[userId].referrer && match[1] !== userId) {
    const refId = match[1];
    users[userId].referrer = refId;
    if (!users[refId]) users[refId] = { id: refId, referrals: [] };
    users[refId].referrals = users[refId].referrals || [];
    if (!users[refId].referrals.includes(userId)) {
      users[refId].referrals.push(userId);
    }
  }

  saveUsers();

  bot.sendMessage(chatId, `👋 Bienvenue sur le Airdrop MBOACOIN !

📌 Étape 1 : Rejoins notre canal Telegram :
👉 https://t.me/+q5siBqhkQCFiNDcx

Envoie une capture d’écran comme preuve pour valider cette étape.`);
  users[userId].step = 1;
  saveUsers();
});

bot.on('photo', (msg) => {
  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  user = users[userId];
  if (!users[userId]) return;

  const step = getStep(users[userId]);
  users[userId].proofs = users[userId].proofs || {};

  switch (step) {
    case 1:
      users[userId].proofs.telegram = msg.photo;
      users[userId].step = 2;
      user.rewards += 10;
      bot.sendMessage(chatId, `🎉 Vous avez gagné 10 MBOA !\n\n✅ Étape 1 validée !

📌 Étape 2 : Aime notre page Facebook :
👉 https://www.facebook.com/profile.php?id=61578396563477

Puis envoie une capture.`);
      break;
    case 2:
      users[userId].proofs.facebook = msg.photo;
      users[userId].step = 3;
      user.rewards += 10;
      bot.sendMessage(chatId, `🎉 Vous avez gagné 10 MBOA !\n\n✅ Étape 2 validée !

📌 Étape 3 : Suis-nous sur Instagram :
👉 https://www.instagram.com/mboa_coin/

Puis envoie une capture.`);
      break;
    case 3:
      users[userId].proofs.instagram = msg.photo;
      users[userId].step = 4;
      user.rewards += 10;
      bot.sendMessage(chatId, `🎉 Vous avez gagné 10 MBOA !\n\n✅ Étape 3 validée !

📌 Étape 4 : Suis-nous sur Twitter :
👉 https://x.com/MboaCoin

Puis envoie une capture.`);
      break;
    case 4:
      users[userId].proofs.twitter = msg.photo;
      users[userId].step = 5;
      user.rewards += 10;
      bot.sendMessage(chatId, `🎉 Vous avez gagné 10 MBOA !\n\n✅ Étape 4 validée !

📌 Étape 5 : Envoie ton adresse BEP20 pour recevoir tes MBOA`);
      break;
  }

  saveUsers();
});

bot.on('message', (msg) => {
  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  user = users[userId];
  user = users[userId];
  if (!user || user.step !== 5) return;

  if (msg.text && msg.text.startsWith('0x') && msg.text.length === 42) {
    user.wallet = msg.text;
    user.step = 6;
    user.rewards += 20;
    saveUsers();

    // Notifier le parrain
    if (user.referrer && users[user.referrer]) {
      users[user.referrer].rewards = (users[user.referrer].rewards || 0) + 50;
      bot.sendMessage(user.referrer, `🎉 Ton filleul @${user.username || userId} a complété toutes les étapes ! Tu viens de gagner 50 MBOA.`);
      saveUsers();
    }

    
    bot.sendMessage(chatId, `🧠 Avant de recevoir tes MBOA, visite notre site officiel 👉 https://mboacoin.com puis réponds à ce petit quiz !\n\nQuestion 1 : Quel est le rôle principal de MboaCoin ?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "A. Investir dans l’immobilier", callback_data: "q1_wrong" }],
          [{ text: "B. Faciliter le commerce en Afrique", callback_data: "q1_correct" }],
          [{ text: "C. Envoyer des vidéos", callback_data: "q1_wrong" }]
        ]
      }
    });
    return;


🔗 Partage ton lien d’affiliation pour gagner 25 MBOA par filleul validé !

💰 Les MBOA seront crédités dans ton portefeuille chaque samedi selon ton nombre de filleuls validés.

🔔 Tu recevras une notification à chaque fois qu’un filleul est validé.

🏆 Les 10 meilleurs parrains de la semaine recevront chacun 1000 MBOA !

👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA de bienvenue !

👇 Clique sur le bouton ci-dessous pour en savoir plus.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Recevoir l’offre", url: "https://airdrop.mboacoin.com/membrefondateur" }],
          [{ text: "❌ Pas intéressé", callback_data: "decline_offer" }]
        ]
      }
    });
  } else {
    bot.sendMessage(chatId, '❗ Adresse BEP20 invalide. Elle doit commencer par 0x...');
  }
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  if (query.data === 'decline_offer') {
    bot.sendMessage(chatId, `🙏 Merci pour ta participation !

📢 Partage ton lien de parrainage autour de toi et gagne :

- 💰 25 MBOA par filleul validé
- 🎁 NFT exclusif (valeur 100 $) chaque semaine si tu es dans le Top 10
- 🔔 Notification à chaque fois qu’un filleul valide toutes ses étapes

📊 Clique ici pour voir le classement (à venir).`);
  }
});

bot.onText(/\/status/, (msg) => {
  const user = users[msg.from.id.toString()];
  bot.sendMessage(msg.chat.id, `📊 Ton avancement : Étape ${user?.step || 0} / 5`);
});

bot.onText(/\/mesfilleuls/, (msg) => {
  const user = users[msg.from.id.toString()];
  if (!user || !user.referrals || user.referrals.length === 0) {
    return bot.sendMessage(msg.chat.id, "Aucun filleul pour l'instant.");
  }

  const lines = user.referrals.map(id => {
    const f = users[id];
    return `👤 @${f?.username || id} - ${f?.step === 6 ? '✅ Validé' : '⏳ En cours'}`;
  });

  bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/top10/, (msg) => {
  const sorted = Object.values(users)
    .sort((a, b) => (b.referrals?.length || 0) - (a.referrals?.length || 0))
    .slice(0, 10);

  const text = sorted.map((u, i) =>
    `${i + 1}. @${u.username || u.id} - ${u.referrals?.length || 0} filleuls`
  ).join('\n');

  bot.sendMessage(msg.chat.id, `🏆 Top 10 des parrains :\n${text}`);
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== adminId) return;
  const text = match[1];
  Object.keys(users).forEach(id => bot.sendMessage(id, `📢 ${text}`).catch(() => {}));
});

bot.onText(/\/export/, (msg) => {
  if (msg.from.id !== adminId) return;

  const csv = require('csv-writer').createObjectCsvWriter({
    path: 'participants.csv',
    header: [
      { id: 'id', title: 'ID' },
      { id: 'username', title: 'Username' },
      { id: 'wallet', title: 'Wallet' },
      { id: 'rewards', title: 'Rewards' },
      { id: 'referrer', title: 'Referrer' }
    ]
  });

  csv.writeRecords(Object.values(users)).then(() => {
    bot.sendDocument(msg.chat.id, 'participants.csv');
  });
});



bot.on('callback_query', (query) => {
  const userId = query.from.id.toString();
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!users[userId]) return;

  users[userId].quiz = users[userId].quiz || { score: 0, step: 1 };

  if (data.startsWith('q1_')) {
    if (data === 'q1_correct') users[userId].quiz.score += 1;
    users[userId].quiz.step = 2;
    bot.sendMessage(chatId, `Question 2 : Quel est le nom de la super app de MboaCoin ?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "A. MboaBank", callback_data: "q2_wrong" }],
          [{ text: "B. MboaSend", callback_data: "q2_wrong" }],
          [{ text: "C. MboaPay", callback_data: "q2_correct" }]
        ]
      }
    });
  } else if (data.startsWith('q2_')) {
    if (data === 'q2_correct') users[userId].quiz.score += 1;
    users[userId].quiz.step = 3;
    bot.sendMessage(chatId, `Question 3 : Combien peut-on gagner en parrainant un filleul validé ?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "A. 10 MBOA", callback_data: "q3_wrong" }],
          [{ text: "B. 25 MBOA", callback_data: "q3_correct" }],
          [{ text: "C. 100 MBOA", callback_data: "q3_wrong" }]
        ]
      }
    });
  } else if (data.startsWith('q3_')) {
    if (data === 'q3_correct') users[userId].quiz.score += 1;
    const score = users[userId].quiz.score;
    delete users[userId].quiz;

    if (score >= 2) {
      users[userId].rewards += 30;
      bot.sendMessage(chatId, `🎉 Bravo ! Tu as bien répondu au quiz (score : ${score}/3).\n\nTu as maintenant gagné 50 MBOA !\n\nVoici ton lien de parrainage personnalisé :\n👉 https://t.me/MboaCoinAirdropBot?start=${userId}\n\n💰 Partage-le pour gagner 25 MBOA par filleul validé !\n🏆 Les 10 meilleurs parrains de la semaine gagnent 1000 MBOA chacun.\n🔔 Tu recevras une notification dès qu’un filleul est validé.\n\n👇 Clique sur le bouton ci-dessous pour devenir Ambassadeur MBOACOIN et recevoir 10.000 MBOA de bienvenue !`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Recevoir l’offre", url: "https://airdrop.mboacoin.com/membrefondateur" }],
            [{ text: "❌ Pas intéressé", callback_data: "decline_offer" }]
          ]
        }
      });
    } else {
      bot.sendMessage(chatId, `❌ Tu n'as pas obtenu assez de bonnes réponses (score : ${score}/3).\n\n🔁 Consulte https://mboacoin.com et retente ta chance avec /start.`);
    }
    saveUsers();
  } else if (data === 'decline_offer') {
    bot.sendMessage(chatId, `🙏 Merci pour ta participation !\n\n📢 Partage ton lien de parrainage autour de toi et gagne :\n\n- 💰 25 MBOA par filleul validé\n- 🎁 NFT exclusif (valeur 100 $) chaque semaine si tu es dans le Top 10\n- 🔔 Notification à chaque fois qu’un filleul valide toutes ses étapes\n\n📊 Clique ici pour voir le classement (à venir).`);
  }
});
