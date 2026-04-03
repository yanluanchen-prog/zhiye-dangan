/**
 * 微信 JSSDK 签名服务 + 排行榜 API
 * 运行：node jssdk-server.js
 * 端口：3000
 * 依赖：npm install express axios crypto better-sqlite3 cors
 */
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['https://mycareer.com', 'http://localhost'] }));

// ══ 微信配置（填入真实值）═══════════════════════════════════
const WX_APPID = 'wx_your_appid_here';
const WX_SECRET = 'your_appsecret_here';

// ══ 排行榜数据库 ════════════════════════════════════════════
const db = new Database('scores.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT,
    nickname TEXT,
    avatar TEXT,
    career TEXT,
    swap_count INTEGER,
    avg_salary INTEGER,
    survived INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── access_token 缓存 ─────────────────────────────────────
let cachedToken = null, tokenExpiry = 0;
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const r = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`);
  cachedToken = r.data.access_token;
  tokenExpiry = Date.now() + (r.data.expires_in - 300) * 1000;
  return cachedToken;
}

// ── jsapi_ticket 缓存 ─────────────────────────────────────
let cachedTicket = null, ticketExpiry = 0;
async function getJsTicket() {
  if (cachedTicket && Date.now() < ticketExpiry) return cachedTicket;
  const token = await getAccessToken();
  const r = await axios.get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`);
  cachedTicket = r.data.ticket;
  ticketExpiry = Date.now() + (r.data.expires_in - 300) * 1000;
  return cachedTicket;
}

// ── JSSDK 签名接口 ────────────────────────────────────────
app.get('/api/wx/signature', async (req, res) => {
  try {
    const url = req.query.url;
    const ticket = await getJsTicket();
    const nonceStr = Math.random().toString(36).slice(2);
    const timestamp = Math.floor(Date.now() / 1000);
    const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(str).digest('hex');
    res.json({ appId: WX_APPID, timestamp, nonceStr, signature });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 提交分数 ──────────────────────────────────────────────
app.post('/api/score', (req, res) => {
  const { openid, nickname, avatar, career, swapCount, avgSalary, survived } = req.body;
  db.prepare(`INSERT INTO scores (openid,nickname,avatar,career,swap_count,avg_salary,survived)
              VALUES (?,?,?,?,?,?,?)`).run(openid||'anon', nickname||'匿名', avatar||'', career||'', swapCount||0, avgSalary||0, survived?1:0);
  res.json({ ok: true });
});

// ── 排行榜（胜利者，按薪资力降序）───────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare(`SELECT nickname,avatar,career,swap_count,avg_salary
                            FROM scores WHERE survived=1
                            ORDER BY avg_salary DESC LIMIT 20`).all();
  res.json(rows);
});

app.listen(3000, () => console.log('🚀 JSSDK server running on :3000'));
