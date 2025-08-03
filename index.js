const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf('8250952159:AAEWY6gV34Dp9Hx-KnwJ2ZWRgDtl8Utfl5Y');
const ADMIN_ID = 6686188145;
const USERS_FILE = './users.json';

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getNextStep(user) {
    const steps = [
        'telegram',
        'facebook',
        'instagram',
        'twitter',
        'wallet'
    ];
    return steps.find(step => !user.tasks[step]);
}

bot.start((ctx) => {
    const users = loadUsers();
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = {
            username: ctx.from.username,
            tasks: { telegram: false, facebook: false, instagram: false, twitter: false, wallet: false },
            proofs: {},
            mboa: 0,
            referrals: [],
            step: 'telegram',
            invited_by: null
        };
        saveUsers(users);
    }
    ctx.reply("👋 Bienvenue sur le Airdrop MBOACOIN !

Pour commencer, veuillez rejoindre notre canal Telegram : https://t.me/mboacoin
Puis tapez 'fait' ici.");
});

bot.hears('fait', (ctx) => {
    const users = loadUsers();
    const id = ctx.from.id;
    const user = users[id];
    const step = user.step;

    if (step === 'telegram') {
        user.tasks.telegram = true;
        user.mboa += 50;
        user.step = 'facebook';
        ctx.reply("✅ Merci ! Vous avez gagné 50 MBOA 🎉

Étape suivante : Abonnez-vous à notre page Facebook et commentez une publication : https://www.facebook.com/profile.php?id=61578396563477
Envoyez une capture d'écran ici.");
    } else if (step === 'facebook') {
        ctx.reply("📸 Merci ! Capture bien reçue.
Étape suivante : Abonnez-vous à notre Instagram : https://www.instagram.com/mboa_coin/
Envoyez une capture d'écran ici.");
        user.tasks.facebook = true;
        user.mboa += 50;
        user.step = 'instagram';
    } else if (step === 'instagram') {
        ctx.reply("📸 Merci !
Étape suivante : Abonnez-vous à notre Twitter : https://x.com/MboaCoin
Envoyez une capture d'écran ici.");
        user.tasks.instagram = true;
        user.mboa += 50;
        user.step = 'twitter';
    } else if (step === 'twitter') {
        ctx.reply("📸 Merci !
Dernière étape : Envoyez votre adresse BEP20 (commençant par 0x...)");
        user.tasks.twitter = true;
        user.mboa += 50;
        user.step = 'wallet';
    } else {
        ctx.reply("✅ Toutes les étapes sont complétées ! 🎉");
    }
    saveUsers(users);
});

bot.hears(/^0x[a-fA-F0-9]{40}$/, (ctx) => {
    const users = loadUsers();
    const id = ctx.from.id;
    const user = users[id];

    if (user.step === 'wallet') {
        user.wallet = ctx.message.text;
        user.tasks.wallet = true;
        user.mboa += 100;
        user.step = 'done';
        ctx.reply("🎉 Félicitations ! Vous avez terminé toutes les étapes et gagné 300 MBOA.
Voici votre lien de parrainage : https://t.me/MboaCoinBot?start=" + id);
        ctx.reply("💎 Pour aller plus loin, devenez Ambassadeur MBOACOIN et recevez 10 000 MBOA + avantages exclusifs", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 Recevoir l'offre", url: "https://airdrop.mboacoin.com/membrefondateur" }],
                    [{ text: "❌ Décliner l'offre", callback_data: "decline_offer" }]
                ]
            }
        });
        saveUsers(users);
    }
});

bot.command('status', (ctx) => {
    const users = loadUsers();
    const id = ctx.from.id;
    const user = users[id];
    ctx.reply(`📊 Tâches complétées :
Telegram: ${user.tasks.telegram ? '✅' : '❌'}
Facebook: ${user.tasks.facebook ? '✅' : '❌'}
Instagram: ${user.tasks.instagram ? '✅' : '❌'}
Twitter: ${user.tasks.twitter ? '✅' : '❌'}
Wallet: ${user.tasks.wallet ? '✅' : '❌'}

Total MBOA: ${user.mboa}`);
});

bot.command('export', (ctx) => {
    if (ctx.from.id === ADMIN_ID) {
        const data = loadUsers();
        const csv = ['Username,TelegramID,MBOA,Wallet'];
        Object.entries(data).forEach(([id, user]) => {
            csv.push(`${user.username},${id},${user.mboa},${user.wallet || ''}`);
        });
        fs.writeFileSync('./export.csv', csv.join('
'));
        ctx.reply('✅ Export CSV généré avec succès !');
    } else {
        ctx.reply('⛔️ Accès refusé.');
    }
});

bot.launch();