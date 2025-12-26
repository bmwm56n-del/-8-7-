const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// توجيه السيرفر لملفات الواجهة
app.use(express.static(path.join(__dirname, 'public')));

let bots = {};

io.on('connection', (socket) => {
    socket.on('start-bot', (data) => {
        const id = `${data.host}-${data.username}`;
        
        if (bots[id]) {
            return socket.emit('status', '✅ البوت يعمل بالفعل في الخلفية.');
        }

        const bot = mineflayer.createBot({
            host: data.host.split(':')[0],
            port: parseInt(data.host.split(':')[1]) || 25565,
            username: data.username,
            version: "1.21.1", // هذا الإصدار يدعم 1.21.11 تماماً
            auth: 'offline'
        });

        bots[id] = { instance: bot };

        bot.on('spawn', () => {
            socket.emit('status', '🚀 تم الدخول بنجاح! البوت الآن يقفز كل 30 ثانية.');
            
            // نظام الـ Anti-AFK
            const afkInterval = setInterval(() => {
                if(bot.entity) {
                    bot.setControlState('jump', true);
                    setTimeout(() => bot.setControlState('jump', false), 500);
                }
            }, 30000);
            
            bots[id].afk = afkInterval;
        });

        bot.on('error', (err) => {
            console.log('Error:', err.message);
            delete bots[id];
        });

        bot.on('end', () => {
            if(bots[id]) clearInterval(bots[id].afk);
            delete bots[id];
            socket.emit('status', '❌ انفصل البوت عن السيرفر.');
        });
    });
});

// رابط الـ Ping لمنع Render من النوم
app.get('/ping', (req, res) => res.send('Pong!'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`السيرفر يعمل على منفذ ${PORT}`));
