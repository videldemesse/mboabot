// index.js

const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const { Parser } = require("json2csv");
const schedule = require("node-schedule");

const bot = new Telegraf("8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y");
const adminId = 6686188145;
const usersFile = "users.json";

// ✔️ Charger les données ou initialiser
let users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};

function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getUser(id) {
  if (!users[id]) {
    users[id] = {
      id,
      username: "",
      wallet: "",
      proofs: {
        telegram: false,
        facebook: false,
        instagram: false,
        twitter: false,
        wallet: false,
      },
      referrer: null,
      referrals: [],
      totalMBOA: 0,
      notifiedAmbassador: false,
    };
  }
  return users[id];
}

function calculateMBOA(user) {
  const base = 20;
  const bonusPerReferral = 50;
  let total = 0;
  const tasks = user.proofs;
  total += tasks.telegram ? base : 0;
  total += tasks.facebook ? base : 0;
  total += tasks.instagram ? base : 0;
  total += tasks.twitter ? base : 0;
  total += tasks.wallet ? base : 0;
  total += user.referrals.filter(fid => users[fid] && Object.values(users[fid].proofs).every(Boolean)).length * bonusPerReferral;
  return total;
}

function hasCompletedAllTasks(user) {
  return Object.values(user.proofs).every(Boolean);
}

// ⚡️ Commande /start
bot.start(async (ctx) => {
  const user = getUser(ctx.from.id);
  user.username = ctx.from.username || "";

  const ref = ctx.startPayload;
  if (ref && ref !== ctx.from.id.toString() && !user.referrer) {
    user.referrer = ref;
    if (!users[ref]) getUser(ref);
    users[ref].referrals.push(ctx.from.id);
  }

  saveUsers();

  await ctx.reply("👋 Bienvenue sur le Airdrop MBOACOIN !\n\nPour commencer, rejoins notre canal Telegram : https://t.me/+q5siBqhkQCFiNDcx\n\nUne fois fait, réponds : *fait*", { parse_mode: "Markdown" });
});

bot.hears(/^fait$/i, async (ctx) => {
  const user = getUser(ctx.from.id);

  if (!user.proofs.telegram) {
    user.proofs.telegram = true;
    await ctx.reply("💛 Merci ! Maintenant, like notre page Facebook et commente une publication : https://www.facebook.com/profile.php?id=61578396563477\nPuis envoie une capture d'écran.");
  } else if (!user.proofs.facebook) {
    user.proofs.facebook = true;
    await ctx.reply("📷 Super ! Maintenant, suis-nous sur Instagram : https://www.instagram.com/mboa_coin/ et envoie une capture d'écran.");
  } else if (!user.proofs.instagram) {
    user.proofs.instagram = true;
    await ctx.reply("📸 Nickel ! Abonne-toi à notre Twitter : https://x.com/MboaCoin et envoie une capture.");
  } else if (!user.proofs.twitter) {
    user.proofs.twitter = true;
    await ctx.reply("👌 Enfin, envoie ton adresse wallet BEP20.");
  }

  saveUsers();
});

bot.hears(/^0x[a-fA-F0-9]{40}$/i, async (ctx) => {
  const user = getUser(ctx.from.id);
  user.wallet = ctx.message.text;
  user.proofs.wallet = true;
  saveUsers();

  user.totalMBOA = calculateMBOA(user);

  await ctx.reply(`🎉 Félicitations ! Tu as terminé toutes les étapes.\n\nVoici ton lien de parrainage : https://t.me/MboaCoinBot?start=${ctx.from.id}\n\n👑 Pour aller plus loin, deviens Ambassadeur MBOACOIN et reçois 10.000 MBOA !`,
    Markup.inlineKeyboard([
      [Markup.button.url("\ud83d\udd25 Recevoir l'offre", "https://airdrop.mboacoin.com/membrefondateur")],
      [Markup.button.callback("❌ Décliner l'offre", "decline_offer")]
    ]));

  // Notifier le parrain
  if (user.referrer) {
    const refUser = getUser(user.referrer);
    if (hasCompletedAllTasks(user)) {
      await bot.telegram.sendMessage(user.referrer, `🎉 Ton filleul @${ctx.from.username || ctx.from.id} a complété toutes les étapes ! Tu viens de gagner 50 MBOA.`);
    }
  }
});

bot.command("/mesfilleuls", (ctx) => {
  const user = getUser(ctx.from.id);
  if (!user.referrals.length) return ctx.reply("Tu n'as encore aucun filleul.");

  const lines = user.referrals.map(id => {
    const filleul = users[id];
    const valid = filleul && hasCompletedAllTasks(filleul);
    return `- @${filleul.username || id} : ${valid ? '✅ Validé' : '⛔ Incomplet'}`;
  });
  ctx.reply(`💸 Tes filleuls :\n${lines.join("\n")}`);
});

bot.command("/export", (ctx) => {
  if (ctx.from.id != adminId) return;
  const parser = new Parser();
  const csv = parser.parse(Object.values(users));
  fs.writeFileSync("export.csv", csv);
  ctx.replyWithDocument({ source: "export.csv" });
});

// Broadcast : /broadcast Votre message ici...
bot.command("/broadcast", (ctx) => {
  if (ctx.from.id != adminId) return;
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  Object.keys(users).forEach(uid => {
    bot.telegram.sendMessage(uid, `📢 ${text}`).catch(() => {});
  });
  ctx.reply("Annonce envoyée.");
});

// Export auto tous les samedis 18h
schedule.scheduleJob("0 18 * * 6", () => {
  const parser = new Parser();
  const csv = parser.parse(Object.values(users));
  fs.writeFileSync("export.csv", csv);
});

bot.launch();
console.log("Bot MBOACOIN démarré ✅");
