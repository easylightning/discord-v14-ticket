const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const { formatDuration } = require('./helpers');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function collectMessages(thread, includeSystemMessages = false) {
  const all = [];
  let before;

  while (true) {
    const batch = await thread.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    const values = [...batch.values()];
    all.push(...values);
    before = values[values.length - 1].id;
    if (batch.size < 100) break;
  }

  return all
    .filter((message) => includeSystemMessages || !message.system)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function renderAttachments(message, config) {
  if (!config.includeAttachments || !message.attachments.size) return '';
  return [...message.attachments.values()].map((attachment) => {
    const isImage = attachment.contentType?.startsWith('image/');
    return `
      <div class="attachment">
        <a href="${escapeHtml(attachment.url)}" target="_blank" rel="noreferrer">${escapeHtml(attachment.name || 'attachment')}</a>
        ${isImage ? `<div><img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.name || 'image')}" /></div>` : ''}
      </div>`;
  }).join('');
}

function renderEmbeds(message, config) {
  if (!config.includeEmbeds || !message.embeds.length) return '';
  return message.embeds.map((embed) => `
    <div class="embed">
      ${embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : ''}
      ${embed.description ? `<div>${escapeHtml(embed.description)}</div>` : ''}
      ${embed.url ? `<a href="${escapeHtml(embed.url)}" target="_blank" rel="noreferrer">Baglantiyi ac</a>` : ''}
    </div>`).join('');
}

function renderHistory(ticketData) {
  const history = Array.isArray(ticketData.history) ? [...ticketData.history].sort((a, b) => (a.at || 0) - (b.at || 0)) : [];
  if (!history.length) return '<div class="empty">Kayitli gecmis bulunmuyor.</div>';

  return history.map((entry) => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-body">
        <div class="timeline-title">${escapeHtml(entry.details || entry.action || 'Islem')}</div>
        <div class="timeline-meta">${entry.tag ? escapeHtml(entry.tag) : escapeHtml(entry.userId || 'Sistem')} • ${new Date(entry.at || Date.now()).toLocaleString('tr-TR')}</div>
      </div>
    </div>
  `).join('');
}

function buildStats(ticketData) {
  const stats = [];
  stats.push(`Ticket No: #${escapeHtml(ticketData.ticketNumber || '0000')}`);
  stats.push(`Kategori: ${escapeHtml(ticketData.categoryLabel || 'Bilinmiyor')}`);
  stats.push(`Acik kalan sure: ${formatDuration((ticketData.closedAt || Date.now()) - (ticketData.createdAt || Date.now()))}`);

  if (ticketData.firstClaimAt) {
    stats.push(`Ilk claim suresi: ${formatDuration(ticketData.firstClaimAt - (ticketData.createdAt || Date.now()))}`);
  }

  if (ticketData.firstStaffResponseAt) {
    stats.push(`Ilk cevap suresi: ${formatDuration(ticketData.firstStaffResponseAt - (ticketData.createdAt || Date.now()))}`);
  }

  if (ticketData.claimedByTag) {
    stats.push(`Son sahiplenen yetkili: ${escapeHtml(ticketData.claimedByTag)}`);
  }

  if (ticketData.closedByTag) {
    stats.push(`Kapatan yetkili: ${escapeHtml(ticketData.closedByTag)}`);
  }

  return stats.map((item) => `<span class="stat-pill">${item}</span>`).join('');
}

async function createTranscript(thread, ticketData, config) {
  const messages = await collectMessages(thread, config.includeSystemMessages);
  const closedAt = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = (config.fileNameFormat || 'ticket-{threadId}-{closedAt}.html')
    .replace('{threadId}', thread.id)
    .replace('{closedAt}', closedAt);
  const folder = path.join(process.cwd(), config.folder || 'transcripts');
  fs.mkdirSync(folder, { recursive: true });
  const filePath = path.join(folder, fileName);

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(thread.name)} Transcript</title>
<style>
:root{color-scheme:dark;--bg:#0a1220;--panel:#111827;--panel-soft:#172033;--line:#263247;--text:#e5e7eb;--muted:#96a2b5;--accent:#4f67ff;--success:#16a34a}
*{box-sizing:border-box} body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:radial-gradient(circle at top,#16213a 0,#0a1220 45%,#050912 100%);color:var(--text);padding:28px}
.container{max-width:1200px;margin:0 auto;display:grid;gap:18px}
.hero,.panel{background:rgba(17,24,39,.94);border:1px solid var(--line);border-radius:22px;box-shadow:0 20px 50px rgba(0,0,0,.28)}
.hero{padding:28px}
.hero-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
.hero-title{font-size:30px;font-weight:800;margin:0 0 8px}
.hero-sub{color:var(--muted);margin:0}
.logo{width:92px;height:92px;border-radius:20px;object-fit:contain;background:#0f172a;padding:12px;border:1px solid var(--line)}
.stat-pills{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.stat-pill{display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:#1f2d48;border:1px solid #33476e;color:#dbe7ff;font-size:13px}
.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px}
.panel{padding:22px}
.panel h2{margin:0 0 14px;font-size:20px}
.meta-list{display:grid;gap:10px}
.meta-item{padding:12px 14px;background:var(--panel-soft);border:1px solid var(--line);border-radius:14px}
.meta-label{display:block;color:var(--muted);font-size:12px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em}
.buttons-preview{display:flex;flex-wrap:wrap;gap:10px}
.button-chip{padding:9px 14px;border-radius:12px;border:1px solid var(--line);background:#1d2434}
.timeline-item{display:flex;gap:12px;align-items:flex-start;padding:10px 0}
.timeline-dot{width:12px;height:12px;border-radius:50%;background:var(--accent);margin-top:5px;box-shadow:0 0 0 6px rgba(79,103,255,.12)}
.timeline-title{font-weight:700}
.timeline-meta{color:var(--muted);font-size:13px;margin-top:4px}
.messages{display:grid;gap:14px}
.message{display:grid;grid-template-columns:52px 1fr;gap:14px;padding:18px;background:rgba(17,24,39,.94);border:1px solid var(--line);border-radius:20px}
.avatar{width:52px;height:52px;border-radius:16px;object-fit:cover;background:#0f172a;border:1px solid var(--line)}
.message-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;align-items:center}
.author{font-weight:700}
.tagline{color:var(--muted);font-size:13px}
.content{white-space:pre-wrap;line-height:1.7}
.attachment,.embed{margin-top:12px;padding:12px;border-radius:14px;background:#0f172a;border:1px solid var(--line)}
.embed-title{font-weight:700;margin-bottom:6px}
img{max-width:100%;border-radius:14px;margin-top:10px}
.empty{color:var(--muted)}
@media (max-width:900px){.grid{grid-template-columns:1fr}.hero-top{flex-direction:column}.logo{width:76px;height:76px}}
</style>
</head>
<body>
<div class="container">
  <section class="hero">
    <div class="hero-top">
      <div>
        <h1 class="hero-title">${escapeHtml(thread.name)}</h1>
        <p class="hero-sub">${escapeHtml(ticketData.categoryLabel || 'Bilinmiyor')} ticket transcripti</p>
      </div>
      ${ticketData.brandingLogoUrl ? `<img class="logo" src="${escapeHtml(ticketData.brandingLogoUrl)}" alt="logo" />` : ''}
    </div>
    <div class="stat-pills">${buildStats(ticketData)}</div>
  </section>

  <div class="grid">
    <section class="panel">
      <h2>Ticket Bilgileri</h2>
      <div class="meta-list">
        <div class="meta-item"><span class="meta-label">Acan</span>${escapeHtml(ticketData.ownerTag || ticketData.ownerId || 'Bilinmiyor')}</div>
        <div class="meta-item"><span class="meta-label">Forum Ismi</span>${escapeHtml(ticketData.forumName || 'Belirtilmedi')}</div>
        <div class="meta-item"><span class="meta-label">Baslik</span>${escapeHtml(ticketData.subject || 'Belirtilmedi')}</div>
        <div class="meta-item"><span class="meta-label">Olusturulma</span>${new Date(ticketData.createdAt || Date.now()).toLocaleString('tr-TR')}</div>
        <div class="meta-item"><span class="meta-label">Kapanis</span>${ticketData.closedAt ? new Date(ticketData.closedAt).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR')}</div>
      </div>
    </section>

    <section class="panel">
      <h2>Butonlar ve Durum</h2>
      <div class="buttons-preview">
        <span class="button-chip">Kapat</span>
        <span class="button-chip">${ticketData.claimedBy ? 'Sahiplenildi' : 'Sahiplen'}</span>
        <span class="button-chip">Uye Ekle</span>
        <span class="button-chip">Uye Cikar</span>
      </div>
      <div class="meta-list" style="margin-top:14px">
        <div class="meta-item"><span class="meta-label">Durum</span>${ticketData.closed ? 'Kapatildi' : 'Acik'}</div>
        <div class="meta-item"><span class="meta-label">Thread ID</span>${escapeHtml(thread.id)}</div>
      </div>
    </section>
  </div>

  <section class="panel">
    <h2>Gecmis</h2>
    ${renderHistory(ticketData)}
  </section>

  <section class="messages">
    ${messages.map((message) => `
    <article class="message">
      <img class="avatar" src="${escapeHtml(message.author?.displayAvatarURL?.() || message.author?.avatarURL?.() || '')}" alt="${escapeHtml(message.author?.tag || 'User')}" />
      <div>
        <div class="message-head">
          <div>
            <div class="author">${escapeHtml(message.member?.displayName || message.author?.tag || 'Unknown')}</div>
            <div class="tagline">${escapeHtml(message.author?.tag || 'Unknown')}</div>
          </div>
          <div class="tagline">${new Date(message.createdTimestamp).toLocaleString('tr-TR')}</div>
        </div>
        <div class="content">${escapeHtml(message.content || '[Icerik yok]')}</div>
        ${renderAttachments(message, config)}
        ${renderEmbeds(message, config)}
      </div>
    </article>`).join('')}
  </section>
</div>
</body>
</html>`;

  fs.writeFileSync(filePath, html, 'utf8');
  return { filePath, attachment: new AttachmentBuilder(filePath) };
}

module.exports = { createTranscript };
