const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('start-bot', (data) => {
        // إذا لم يدخل المستخدم إصداراً، سنحاول استخدام ما طلبه السيرفر سابقاً
        const targetVersion = (data.version && data.version !== "") ? data.version : false;
        
        socket.emit('status', `⏳ محاولة الاتصال بإصدار: ${targetVersion || 'تلقائي'}...`);

        const hostParts = data.host.split(':');
        
        const botOptions = {
            host: hostParts[0],
            port: hostParts[1] ? parseInt(hostParts[1]) : 25565,
            username: data.username || 'AFK_Bot',
            version: targetVersion, // سيستخدم ما تكتبه في الخانة
            hideErrors: false,
            checkTimeoutInterval: 60000
        };

        try {
            const bot = mineflayer.createBot(botOptions);

            bot.on('spawn', () => {
                socket.emit('status', `✅ نجح الاتصال! البوت الآن داخل السيرفر.`);
                console.log('Bot is online!');
            });

            bot.on('chat', (username, message) => {
                socket.emit('status', `💬 [${username}]: ${message}`);
            });

            bot.on('error', (err) => {
                console.log('Error:', err.message);
                socket.emit('status', `❌ خطأ من السيرفر: ${err.message}`);
            });

            bot.on('kick', (reason) => {
                socket.emit('status', `⚠️ طرد: ${reason}`);
            });
            
            bot.on('end', () => {
                socket.emit('status', '🔴 تم قطع الاتصال.');
            });

        } catch (e) {
            socket.emit('status', '❌ فشل في بدء المحرك.');
        }
    });
});

server.listen(3000, () => {
    console.log('🚀 الموقع يعمل: http://localhost:3000');
});