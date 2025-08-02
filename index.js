// index.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { parse } = require('json2csv');

// === CONFIGURATION ===
const token = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const bot = new TelegramBot(token, { polling: true });
const ADMIN_IDS = ['6686188145']; // Remplacer par ton ID Telegram

const DATA_FILE = './data.json';
const proofsDir = path.join(__dirname, 'proofs');
const sessions = {};

// === Initialisation ===
if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

// === Sauvegarde des données ===
function saveUser(data) {
  const users = JSON.parse(fs.readFileSync(DATA_FILE));
  users.push(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// === Commande /start ===
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || 'inconnu';
  sessions[chatId] = {
    telegram_id: chatId,
    username,
    date: new Date().toISOString(),
    step: 'wallet'
  };
  bot.sendMessage(chatId, `👋 Bonjour ${msg.from.first_name} !\n\nBienvenue dans l'airdrop officiel de MboaCoin 🚀\n\nÉtape 1️⃣ : Envoie ton adresse wallet BEP-20 (BNB Chain) :`);
});

// === Commande /status ===
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  const user = data.find(u => u.telegram_id === chatId);
  if (!user) return bot.sendMessage(chatId, "❌ Tu n'as pas encore complété ta participation. Tape /start pour commencer.");

  const info = `👤 *Infos enregistrées :*\n🧑 Pseudo : @${user.username}\n💼 Wallet : ${user.wallet}\n🐦 Twitter : ${user.twitter}\n📘 Facebook : ${user.facebook}\n📸 Instagram : ${user.instagram}\n🖼️ Capture : ${user.proof}\n📅 Date : ${user.date}`;
  bot.sendMessage(chatId, info, { parse_mode: 'Markdown' });
});

// === Commande /export (ADMIN) ===
bot.onText(/\/export/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (!ADMIN_IDS.includes(chatId)) return bot.sendMessage(chatId, "⛔️ Accès refusé. Commande réservée à l’admin.");

  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  const csv = parse(data, { fields: ['telegram_id', 'username', 'wallet', 'twitter', 'facebook', 'instagram', 'proof', 'date'] });
  const filePath = './participants.csv';
  fs.writeFileSync(filePath, csv);
  bot.sendDocument(chatId, filePath);
});

// === Commande /list (ADMIN) ===
bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (!ADMIN_IDS.includes(chatId)) return bot.sendMessage(chatId, "⛔️ Accès refusé. Commande réservée à l’admin.");

  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  if (data.length === 0) return bot.sendMessage(chatId, "Aucun participant enregistré.");

  const usernames = data.map(u => `@${u.username || 'inconnu'}`).join('\n');
  bot.sendMessage(chatId, `📋 *Participants :*\n\n${usernames}`, { parse_mode: 'Markdown' });
});

// === Commande /delete [username] (ADMIN) ===
bot.onText(/\/delete (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  const usernameToDelete = match[1].replace('@', '').trim().toLowerCase();
  if (!ADMIN_IDS.includes(chatId)) return bot.sendMessage(chatId, "⛔️ Accès refusé. Commande réservée à l’admin.");

  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  const filtered = data.filter(u => (u.username || '').toLowerCase() !== usernameToDelete);

  if (filtered.length === data.length) return bot.sendMessage(chatId, `❌ Aucun utilisateur trouvé avec le nom : @${usernameToDelete}`);

  fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
  const logEntry = `[${new Date().toISOString()}] SUPPRESSION : @${usernameToDelete} par ${msg.from.username || 'admin'} (${chatId})\n`;
  fs.appendFileSync('log.txt', logEntry);

  bot.sendMessage(chatId, `✅ Utilisateur @${usernameToDelete} supprimé avec succès.`);
});

// === Traitement principal ===
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (!sessions[chatId]) return;
  const user = sessions[chatId];
  const text = msg.text ? msg.text.trim() : '';
  if (['/start', '/status', '/export', '/list'].includes(text)) return;

  switch (user.step) {
    case 'wallet':
      if (!/^0x[a-fA-F0-9]{40}$/.test(text)) return bot.sendMessage(chatId, "❌ Adresse invalide. Elle doit commencer par 0x et contenir 42 caractères.");
      user.wallet = text; user.step = 'twitter';
      bot.sendMessage(chatId, "Étape 2️⃣ : Ton pseudo Twitter ? (ex : @monpseudo)");
      break;

    case 'twitter':
      user.twitter = text; user.step = 'facebook';
      bot.sendMessage(chatId, "Étape 3️⃣ : Ton nom d'utilisateur Facebook ?");
      break;

    case 'facebook':
      user.facebook = text; user.step = 'instagram';
      bot.sendMessage(chatId, "Étape 4️⃣ : Ton pseudo Instagram ?");
      break;

    case 'instagram':
      user.instagram = text; user.step = 'proof';
      bot.sendMessage(chatId, "Étape 5️⃣ : Envoie une capture d’écran de preuve 📸");
      break;

    case 'proof':
      if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;

        bot.getFileLink(fileId).then(fileUrl => {
          const fileName = `proof_${user.username}_${Date.now()}.jpg`;
          const filePath = path.join(proofsDir, fileName);
          const file = fs.createWriteStream(filePath);

          https.get(fileUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              user.proof = fileName;
              user.step = 'done';
              saveUser(user);
              delete sessions[chatId];

              bot.sendMessage(chatId, `🎉 Félicitations !\n\n✅ Ta capture est enregistrée.\n\n📢 Bonus : Gagne 50 MBOA par filleul.\n il te suffit de partager ton lien ffilié que tu as reçu par e-mail juste après ton inscription; Les primes des filleuls sont envoyés chaque samedi dans votre wallet.\n\nMerci pour ta participation 🙏`);
            });
          });
        });
      } else {
        bot.sendMessage(chatId, "❌ Envoie une image comme capture d’écran.");
      }
      break;
  }
});
