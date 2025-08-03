// 📁 index.js — Version complète avec /startover et logique corrigée

const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");

const bot = new Telegraf("8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y");
const ADMIN_ID = "6686188145";
const DATA_PATH = path.join(__dirname, "users.json");

// ✅ Chargement des utilisateurs ou création du fichier si inexistant
let users = {};
if (fs.existsSync(DATA_PATH)) {
  users = JSON.parse(fs.readFileSync(DATA_PATH));
} else {
  fs.writeFileSync(DATA_PATH, JSON.stringify({}));
}

function saveUsers() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2));
}

function getUser(ctx) {
  const id = String(ctx.from.id);
  if (!users[id]) {
    users[id] = {
      id,
      username: ctx.from.username || "",
      ref: ctx.startPayload || null,
      step: 0,
      tasks: {
        wallet: false,
        telegram: false,
        facebook: false,
        instagram: false,
        twitter: false,
      },
      proofs: {
        telegram: null,
        facebook: null,
        instagram: null,
        twitter: null,
      },
      walletAddress: null,
      mboas: 0,
      referrals: [],
    };
  }
  return users[id];
}

function allTasksCompleted(u) {
  return Object.values(u.tasks).every(Boolean);
}

function rewardUser(user, amount) {
  user.mboas += amount;
}

function sendStep(ctx, user) {
  const step = user.step;
  switch (step) {
    case 0:
      ctx.reply("📲 Étape 1 : Rejoins notre canal Telegram et envoie une capture.");
      break;
    case 1:
      ctx.reply("👍 Étape 2 : Aime notre page Facebook et commente une publication. Capture obligatoire.\nhttps://www.facebook.com/profile.php?id=61578396563477");
      break;
    case 2:
      ctx.reply("📸 Étape 3 : Abonne-toi à notre Instagram et envoie une capture.\nhttps://www.instagram.com/mboa_coin/");
      break;
    case 3:
      ctx.reply("🐦 Étape 4 : Abonne-toi à notre Twitter et envoie une capture.\nhttps://x.com/MboaCoin");
      break;
    case 4:
      ctx.reply("💼 Étape 5 : Envoie ton adresse Wallet BEP20 (Metamask ou Trust Wallet).");
      break;
    case 5:
      rewardUser(user, 200); // récompense totale
      ctx.reply(`🎉 Félicitations ! Tu as terminé toutes les étapes.\n\nVoici ton lien de parrainage : https://airdrop.mboacoin.com/membrefondateur?ref=${user.id}`);
      ctx.reply("👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA !",
        Markup.inlineKeyboard([
          [Markup.button.url("🔥 Recevoir l'offre", "https://airdrop.mboacoin.com/membrefondateur")],
          [Markup.button.callback("❌ Décliner l'offre", "decline_offer")],
        ])
      );
      break;
  }
}

bot.start((ctx) => {
  const user = getUser(ctx);
  ctx.reply("👋 Bienvenue sur le Airdrop MBOACOIN !");
  sendStep(ctx, user);
  saveUsers();
});

bot.command("startover", (ctx) => {
  const id = String(ctx.from.id);
  users[id] = undefined;
  saveUsers();
  ctx.reply("🔄 Tes données ont été réinitialisées. Envoie /start pour recommencer le processus.");
});

bot.on("photo", (ctx) => {
  const user = getUser(ctx);
  const step = user.step;

  switch (step) {
    case 0:
      user.tasks.telegram = true;
      rewardUser(user, 25);
      user.proofs.telegram = ctx.message.photo;
      ctx.reply("✅ Étape Telegram complétée. +25 MBOA !");
      break;
    case 1:
      user.tasks.facebook = true;
      rewardUser(user, 25);
      user.proofs.facebook = ctx.message.photo;
      ctx.reply("✅ Étape Facebook complétée. +25 MBOA !");
      break;
    case 2:
      user.tasks.instagram = true;
      rewardUser(user, 25);
      user.proofs.instagram = ctx.message.photo;
      ctx.reply("✅ Étape Instagram complétée. +25 MBOA !");
      break;
    case 3:
      user.tasks.twitter = true;
      rewardUser(user, 25);
      user.proofs.twitter = ctx.message.photo;
      ctx.reply("✅ Étape Twitter complétée. +25 MBOA !");
      break;
    default:
      ctx.reply("📌 Cette capture n'est pas attendue à cette étape.");
  }

  if (step < 4) {
    user.step++;
    sendStep(ctx, user);
  } else if (step === 4) {
    // attend wallet
  }

  saveUsers();
});

bot.on("text", (ctx) => {
  const user = getUser(ctx);
  const step = user.step;

  // Supposons que wallet est texte simple à l’étape 4
  if (step === 4 && ctx.message.text.startsWith("0x") && ctx.message.text.length === 42) {
    user.walletAddress = ctx.message.text;
    user.tasks.wallet = true;
    rewardUser(user, 100);
    ctx.reply("✅ Wallet enregistré. +100 MBOA !");
    user.step++;
    sendStep(ctx, user);
    saveUsers();
    return;
  }
});

bot.action("decline_offer", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("👌 Merci pour ta participation ! Tu recevras tes MBOA chaque semaine selon ton statut.");
});

bot.launch().then(() => console.log("🚀 MboaBot est en ligne !"));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
