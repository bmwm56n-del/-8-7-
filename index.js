const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// توجيه السيرفر للمجلد العام
app.use(express.static(path.join(__dirname, 'public')));

let bots = {};

io.on('connection', (socket) => {
    socket.on('start-bot', (data) => {
        const id = `${data.host}-${data.username}`;
        
        if (bots[id]) {
            return socket.emit('status', '⚠️ البوت يعمل بالفعل!');
        }

        socket.emit('status', '⏳ جاري محاولة الاتصال بالسيرفر...');

        const bot = mineflayer.createBot({
            host: data.host.split(':')[0],
            port: parseInt(data.host.split(':')[1]) || 25565,
            username: data.username,
            version: "1.21.1", // هذا البروتوكول يدعم 1.21.11 تماماً
            auth: 'offline'
        });

        bots[id] = { instance: bot };

        bot.on('spawn', () => {
            socket.emit('status', '🚀 تم الدخول بنجاح! البوت الآن يقفز كل 30 ثانية.');
            
            // نظام الـ Anti-AFK (القفز)
            const afkInterval = setInterval(() => {
                if(bot.entity) {
                    bot.setControlState('jump', true);
                    setTimeout(() => bot.setControlState('jump', false), 500);
                }
            }, 30000);
            
            bots[id].afk = afkInterval;
        });

        bot.on('error', (err) => {
            socket.emit('status', `❌ خطأ: ${err.message}`);
            if(bots[id] && bots[id].afk) clearInterval(bots[id].afk);
            delete bots[id];
        });

        bot.on('end', () => {
            socket.emit('status', '❌ انفصل البوت عن السيرفر.');
            if(bots[id] && bots[id].afk) clearInterval(bots[id].afk);
            delete bots[id];
        });
    });
});

// رابط لمنع Render من النوم (Ping)
app.get('/ping', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
