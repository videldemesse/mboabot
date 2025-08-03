const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const TOKEN = '8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y';
const ADMIN_ID = 6686188145;
const BOT = new Telegraf(TOKEN);
const FILE_PATH = './users.json';

// 🔁 Lecture & écriture JSON
function readUsers() {
    if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(FILE_PATH));
}

function writeUsers(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

// 🟢 START
BOT.start(async (ctx) => {
    const users = readUsers();
    const id = ctx.from.id;

    if (!users[id]) {
        users[id] = {
            username: ctx.from.username,
            tasks: {
                telegram: false,
                facebook: false,
                instagram: false,
                twitter: false,
                wallet: null,
                proofs: {
                    telegram: null,
                    facebook: null,
                    instagram: null,
                    twitter: null,
                }
            },
            referrals: [],
            mboa: 0,
            referrer: null,
            validated: false
        };
        writeUsers(users);
    }

    await ctx.reply("👋 Bienvenue sur l’airdrop MboaCoin !\n\n🔹 Pour commencer, rejoins notre canal Telegram puis réponds par *Fait*.", { parse_mode: "Markdown" });
    users[id].nextStep = 'telegram';
    writeUsers(users);
});

// 🔄 Étapes successives
// Gestion des preuves par capture
BOT.on('photo', async (ctx) => {
    const users = readUsers();
    const id = ctx.from.id;
    const step = users[id]?.nextStep;

    if (!step) return;

    const photo = ctx.message.photo;
    if (!photo) return;

    switch (step) {
        case 'facebook':
            users[id].tasks.facebook = true;
            users[id].tasks.proofs.facebook = photo;
            users[id].nextStep = 'instagram';
            await ctx.reply("✅ Facebook validé !\nMaintenant, abonne-toi à notre Instagram : https://www.instagram.com/mboa_coin/\nPuis envoie une capture.");
            break;

        case 'instagram':
            users[id].tasks.instagram = true;
            users[id].tasks.proofs.instagram = photo;
            users[id].nextStep = 'twitter';
            await ctx.reply("✅ Instagram validé !\nMaintenant, suis notre Twitter : https://x.com/MboaCoin\nPuis envoie une capture.");
            break;

        case 'twitter':
            users[id].tasks.twitter = true;
            users[id].tasks.proofs.twitter = photo;
            users[id].nextStep = 'wallet';
            await ctx.reply("✅ Twitter validé !\nMaintenant, envoie ton adresse de wallet BEP20 (commence par 0x...).");
            break;
    }

    writeUsers(users);
});


// 📦 Commandes
BOT.command('status', (ctx) => {
    const users = readUsers();
    const user = users[ctx.from.id];
    if (!user) return ctx.reply("Aucune donnée enregistrée.");

    const status = `
👤 Utilisateur : @${user.username}
🏦 Wallet : ${user.tasks.wallet || "Non défini"}
✅ Tâches :
- Telegram : ${user.tasks.telegram ? "✅" : "❌"}
- Facebook : ${user.tasks.facebook ? "✅" : "❌"}
- Instagram : ${user.tasks.instagram ? "✅" : "❌"}
- Twitter : ${user.tasks.twitter ? "✅" : "❌"}

💰 Total MBOA : ${user.mboa}
👥 Nombre de filleuls : ${user.referrals.length}
`;
    ctx.reply(status);
});

BOT.command('proofs', (ctx) => {
    ctx.reply("📸 Merci d’envoyer les captures d’écran une par une pour chaque réseau.");
});

BOT.command('mesfilleuls', (ctx) => {
    const users = readUsers();
    const user = users[ctx.from.id];
    if (!user) return ctx.reply("Aucun filleul.");

    let message = `👥 Filleuls de @${ctx.from.username} :\n`;
    user.referrals.forEach(fid => {
        const filleul = users[fid];
        if (filleul) {
            const status = filleul.validated ? "✅ Validé" : "⛔ Incomplet";
            message += `@${filleul.username} – ${status}\n`;
        }
    });

    ctx.reply(message);
});

BOT.command('export', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Non autorisé.");

    const users = readUsers();
    const rows = ["username,wallet,mboa,referrals"];
    Object.values(users).forEach(u => {
        rows.push(`${u.username},${u.tasks.wallet},${u.mboa},${u.referrals.length}`);
    });

    const csv = rows.join('\n');
    const filename = `export_${Date.now()}.csv`;
    fs.writeFileSync(filename, csv);
    ctx.replyWithDocument({ source: filename });
});

// 🔁 Export hebdo automatique (samedi 18h)
schedule.scheduleJob('0 18 * * 6', () => {
    const users = readUsers();
    const rows = ["username,wallet,mboa,referrals"];
    Object.values(users).forEach(u => {
        rows.push(`${u.username},${u.tasks.wallet},${u.mboa},${u.referrals.length}`);
    });

    const csv = rows.join('\n');
    const filename = `auto_export_${Date.now()}.csv`;
    fs.writeFileSync(filename, csv);

    BOT.telegram.sendDocument(ADMIN_ID, { source: filename });
});

// 🔗 /start avec parrainage
BOT.on('message', (ctx, next) => {
    const args = ctx.message.text.split(' ');
    if (args[0] === '/start' && args[1]) {
        const ref = args[1];
        const users = readUsers();
        const id = ctx.from.id;
        if (!users[id]) return;

        if (!users[id].referrer && id != ref && users[ref]) {
            users[id].referrer = parseInt(ref);
            users[ref].referrals.push(id);
            writeUsers(users);
        }
    }
    return next();
});

// ▶️ Lancer le bot
BOT.launch();
console.log("🤖 MboaBot est en ligne !");
