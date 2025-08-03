const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// 🔐 Token Telegram et ID admin
const bot = new Telegraf('8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y');
const ADMIN_ID = '6686188145';

// 📁 Fichier de stockage
const usersFilePath = path.join(__dirname, 'users.json');
let users = {};

// 🧱 Crée le fichier users.json s’il n’existe pas
if (!fs.existsSync(usersFilePath)) {
  console.log('🆕 Fichier users.json non trouvé. Création en cours...');
  fs.writeFileSync(usersFilePath, JSON.stringify({}, null, 2), 'utf-8');
  console.log('✅ Fichier users.json créé avec succès.');
}

// 📖 Lire les utilisateurs
function readUsers() {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf-8');
    users = JSON.parse(data);
  } catch (error) {
    console.error("❌ Erreur lors de la lecture de users.json :", error);
    users = {};
  }
}

// 💾 Sauvegarder les utilisateurs
function saveUsers() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde de users.json :", error);
  }
}

// 🚀 Charger les données utilisateurs
readUsers();

// 🟢 Commande /start
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      username: ctx.from.username ? '@' + ctx.from.username : '',
      referrerId: ctx.startPayload || null,
      step: 'telegram',
      wallet: '',
      tasks: {
        telegram: { done: false, proof: '' },
        facebook: { done: false, proof: '' },
        instagram: { done: false, proof: '' },
        twitter: { done: false, proof: '' },
        wallet: { valid: false, address: '' }
      },
      mboaEarned: 0,
      referrals: [],
      affiliateLink: `https://t.me/${ctx.me}?start=${userId}`,
      ambassadorOffer: ''
    };
    saveUsers();
  }

  if (users[userId].step === 'completed') {
    return ctx.reply("✅ Tu as déjà complété le airdrop. Utilise /status pour voir tes infos.");
  }

  await ctx.reply("👋 Bienvenue sur le Airdrop MBOACOIN !

Étape 1 : Rejoins notre canal Telegram puis réponds 'fait'.");
});

// 🔄 Gestion du flux étape par étape
bot.on('message', async (ctx) => {
  const userId = ctx.from.id.toString();
  const msg = ctx.message;
  const user = users[userId];
  if (!user) return ctx.reply("Utilise /start pour commencer.");

  const step = user.step;

  switch (step) {
    case 'telegram':
      user.tasks.telegram = { done: true, proof: 'fait' };
      user.step = 'facebook';
      await ctx.reply("✅ Merci !

Étape 2 : Like et commente un post ici : https://www.facebook.com/profile.php?id=61578396563477
Puis envoie une capture.");
      break;

    case 'facebook':
      if (!msg.photo) return ctx.reply("❌ Merci d'envoyer une **capture d'écran**.");
      user.tasks.facebook = { done: true, proof: 'capture_facebook' };
      user.step = 'instagram';
      await ctx.reply("✅ Facebook validé !

Étape 3 : Suis notre page Instagram : https://www.instagram.com/mboa_coin/
Et envoie une capture.");
      break;

    case 'instagram':
      if (!msg.photo) return ctx.reply("❌ Merci d'envoyer une **capture Instagram**.");
      user.tasks.instagram = { done: true, proof: 'capture_instagram' };
      user.step = 'twitter';
      await ctx.reply("✅ Merci !

Étape 4 : Suis notre compte Twitter : https://x.com/MboaCoin
Et envoie ton pseudo + une capture.");
      break;

    case 'twitter':
      if (!msg.photo || !msg.caption) return ctx.reply("❌ Envoie une capture + ton pseudo Twitter en légende.");
      user.tasks.twitter = { done: true, proof: msg.caption };
      user.step = 'wallet';
      await ctx.reply("✅ Dernière étape !

Envoie maintenant ton adresse BEP20 (commence par 0x...).");
      break;

    case 'wallet':
      const wallet = msg.text.trim();
      if (!wallet.startsWith('0x') || wallet.length !== 42) {
        return ctx.reply("❌ Adresse invalide. Elle doit commencer par 0x et faire 42 caractères.");
      }
      user.wallet = wallet;
      user.tasks.wallet = { valid: true, address: wallet };
      user.step = 'completed';
      saveUsers();

      await ctx.reply("🎉 Félicitations, tu as complété le Airdrop ! Voici ton lien affilié :
" + user.affiliateLink);
      await ctx.reply("🔥 Pour aller plus loin, deviens ambassadeur et reçois 10.000 MBOA !", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📲 Recevoir l'offre", url: "https://airdrop.mboacoin.com/membrefondateur" }],
            [{ text: "❌ Décliner", callback_data: "decline_offer" }]
          ]
        }
      });
      break;

    case 'completed':
      await ctx.reply("✅ Tu as déjà terminé toutes les étapes. Utilise /status pour voir tes infos.");
      break;
  }

  saveUsers();
});

bot.launch();
