/**
 * Proxy de URLs codificadas (estilo CroxyProxy) para a Bancada MequiDonalds.
 *
 * Como funciona:
 *  - Cada URL vira um token:  <assinatura>.<url em base64url>
 *  - A assinatura é um HMAC da ORIGEM (https://site.com), então só origens
 *    geradas pelo próprio servidor podem ser acessadas (não é um proxy aberto).
 *  - GET /p/<token> busca a página, remove cabeçalhos que impedem iframe
 *    (X-Frame-Options / CSP), reescreve os links do HTML/CSS para passarem
 *    pelo proxy e injeta um script que ajusta fetch/XHR/window.open.
 *  - Proteção contra SSRF: bloqueia IPs privados/loopback na hora da conexão
 *    (inclusive contra DNS rebinding), só permite portas 80/443 e http/https.
 */
const crypto = require('crypto');
const dns = require('dns');
const net = require('net');
const { Readable } = require('stream');
const { Router } = require('express');
const { Agent, fetch: undiciFetch } = require('undici');

const MAX_TEXT_BYTES = 8 * 1024 * 1024;
const ALLOWED_PORTS = new Set(['', '80', '443']);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/* ---------- Bloqueio de endereços internos (SSRF) ---------- */

const blocked = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([ip, prefix]) => blocked.addSubnet(ip, prefix, 'ipv4'));
blocked.addAddress('::', 'ipv6');
blocked.addAddress('::1', 'ipv6');
blocked.addSubnet('fc00::', 7, 'ipv6');
blocked.addSubnet('fe80::', 10, 'ipv6');
blocked.addSubnet('ff00::', 8, 'ipv6');

function isBlockedIp(address) {
  const version = net.isIP(address);
  if (!version) return true;
  return blocked.check(address, version === 6 ? 'ipv6' : 'ipv4');
}

// Roda no momento da conexão: impede DNS rebinding.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const allowed = addresses.filter((a) => !isBlockedIp(a.address));
    if (allowed.length === 0) return callback(new Error('Destino não permitido.'));
    if (options && options.all) return callback(null, allowed);
    return callback(null, allowed[0].address, allowed[0].family);
  });
}

const dispatcher = new Agent({
  connect: { lookup: safeLookup, timeout: 10_000 },
  headersTimeout: 15_000,
  bodyTimeout: 60_000,
});

function assertAllowedTarget(url) {
  if (!ALLOWED_PORTS.has(url.port)) throw new Error('Porta não permitida.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('Destino não permitido.');
  }
  if (net.isIP(host) && isBlockedIp(host)) throw new Error('Destino não permitido.');
}

/* ---------- Tokens codificados e assinados ---------- */

function sigFor(secret, origin) {
  return crypto.createHmac('sha256', secret).update(origin).digest('base64url').slice(0, 22);
}

function makeToken(secret, href) {
  const url = new URL(href);
  url.hash = '';
  return `${sigFor(secret, url.origin)}.${Buffer.from(url.href).toString('base64url')}`;
}

function readToken(secret, token) {
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  try {
    const sig = token.slice(0, dot);
    const url = new URL(Buffer.from(token.slice(dot + 1), 'base64url').toString('utf8'));
    if (!/^https?:$/.test(url.protocol)) return null;
    const a = Buffer.from(sig);
    const b = Buffer.from(sigFor(secret, url.origin));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return url;
  } catch {
    return null;
  }
}

// Vídeos do YouTube usam a URL de embed
function embedUrlFor(tipo, url) {
  if (tipo !== 'video') return url;
  try {
    const parsed = new URL(url);
    let id = '';
    if (parsed.hostname.includes('youtu.be')) id = parsed.pathname.slice(1);
    else if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v') || '';
      else if (parsed.pathname.startsWith('/embed/')) id = parsed.pathname.split('/embed/')[1];
      else if (parsed.pathname.startsWith('/shorts/')) id = parsed.pathname.split('/shorts/')[1];
    }
    id = id.split('&')[0].split('?')[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  } catch {
    return url;
  }
}

/* ---------- Reescrita de HTML / CSS ---------- */

function urlRewriter(secret, base) {
  return (raw) => {
    const value = String(raw).replace(/&amp;/g, '&').trim();
    if (!value || /^(#|data:|blob:|javascript:|mailto:|tel:|about:)/i.test(value)) return raw;
    try {
      const abs = new URL(value, base);
      if (!/^https?:$/.test(abs.protocol)) return raw;
      const hash = abs.hash;
      return `/p/${makeToken(secret, abs.href)}${hash}`;
    } catch {
      return raw;
    }
  };
}

function rewriteCss(css, rewrite) {
  return css
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, q, u) => `url(${q}${rewrite(u)}${q})`)
    .replace(/@import\s+(['"])(.*?)\1/gi, (_, q, u) => `@import ${q}${rewrite(u)}${q}`);
}

function clientScript(pageUrl, sig) {
  const safe = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  return `<script>(function(){
var ORIGIN=${safe(pageUrl.origin)},BASE=${safe(pageUrl.href)},SIG=${safe(sig)};
function enc(s){return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');}
function px(u){
  try{
    if(u instanceof URL)u=u.href;
    if(typeof u!=='string'||/^(data:|blob:|javascript:|#|about:|\\/p\\/)/i.test(u.trim()))return u;
    var a=new URL(u,BASE);
    if(a.origin!==ORIGIN)return u;
    a.hash='';
    return '/p/'+SIG+'.'+enc(a.href);
  }catch(e){return u;}
}
var of=window.fetch;
window.fetch=function(i,o){return of.call(this,(typeof i==='string'||i instanceof URL)?px(i):i,o);};
var ox=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(u);return ox.apply(this,arguments);};
var oo=window.open;
window.open=function(u){arguments[0]=px(u);return oo.apply(this,arguments);};
var sa=Element.prototype.setAttribute;
Element.prototype.setAttribute=function(n,v){
  if(/^(src|href|action|poster)$/i.test(n)&&typeof v==='string')v=px(v);
  return sa.call(this,n,v);
};
[[HTMLImageElement,'src'],[HTMLScriptElement,'src'],[HTMLIFrameElement,'src'],[HTMLLinkElement,'href'],
 [HTMLAnchorElement,'href'],[HTMLSourceElement,'src'],[HTMLMediaElement,'src']].forEach(function(p){
  var d=Object.getOwnPropertyDescriptor(p[0].prototype,p[1]);
  if(d&&d.set)Object.defineProperty(p[0].prototype,p[1],{get:d.get,set:function(v){d.set.call(this,px(v));},configurable:true,enumerable:d.enumerable});
});
})();</script>`;
}

function rewriteHtml(html, pageUrl, secret) {
  let base = pageUrl;
  const baseTag = /<base\s[^>]*href\s*=\s*(["'])(.*?)\1/i.exec(html);
  if (baseTag) {
    try { base = new URL(baseTag[2], pageUrl); } catch { /* mantém pageUrl */ }
  }
  const rewrite = urlRewriter(secret, base);

  // Atributos só são reescritos no HTML, nunca dentro do código de <script>
  // (senão strings de JS como '<a href="' + url + '">' seriam corrompidas).
  const rewriteMarkup = (markup) => markup
    .replace(/\s(?:integrity|nonce)\s*=\s*(["']).*?\1/gi, '')
    .replace(/\b(href|src|action|poster|formaction|data-src)\s*=\s*(["'])(.*?)\2/gi,
      (_, attr, q, val) => `${attr}=${q}${rewrite(val)}${q}`)
    .replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (_, q, val) => {
      const parts = val.split(',').map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        return [rewrite(u), ...rest].join(' ');
      });
      return `srcset=${q}${parts.join(', ')}${q}`;
    })
    .replace(/\bstyle\s*=\s*(["'])(.*?)\1/gi, (_, q, css) => `style=${q}${rewriteCss(css, rewrite)}${q}`);

  const scripts = [];
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    const open = /^<script\b[^>]*>/i.exec(block)[0];
    scripts.push(rewriteMarkup(open) + block.slice(open.length));
    return `\uE000${scripts.length - 1}\uE000`;
  });

  out = rewriteMarkup(
    out
      .replace(/<base\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '')
      .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => `<style${attrs}>${rewriteCss(css, rewrite)}</style>`),
  ).replace(/\uE000(\d+)\uE000/g, (_, i) => scripts[Number(i)]);

  const script = clientScript(pageUrl, sigFor(secret, pageUrl.origin));
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => m + script);
  else if (/<html[^>]*>/i.test(out)) out = out.replace(/<html[^>]*>/i, (m) => m + script);
  else out = script + out;
  return out;
}

async function readLimited(resp) {
  const length = Number(resp.headers.get('content-length') || 0);
  if (length > MAX_TEXT_BYTES) throw Object.assign(new Error('Conteúdo muito grande.'), { status: 413 });
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length > MAX_TEXT_BYTES) throw Object.assign(new Error('Conteúdo muito grande.'), { status: 413 });
  return buffer;
}

/* ---------- Limite simples de requisições por IP ---------- */

const hits = new Map();
function limiter(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = hits.get(key) || { count: 0, reset: now + 10 * 60 * 1000 };
  if (now > current.reset) { current.count = 0; current.reset = now + 10 * 60 * 1000; }
  current.count += 1;
  hits.set(key, current);
  if (current.count > 1500) return res.status(429).type('text/plain').send('Muitas requisições. Aguarde alguns minutos.');
  return next();
}

/* ---------- Rota /p/:token ---------- */

function createProxy({ secret, allowedOrigins = [] }) {
  const router = Router();
  const frameAncestors = `'self' ${allowedOrigins.length ? allowedOrigins.join(' ') : '*'}`;

  router.get('/p/:token', limiter, async (req, res) => {
    if (!secret) return res.status(503).type('text/plain').send('Proxy não configurado no servidor.');

    const target = readToken(secret, req.params.token);
    if (!target) return res.status(400).type('text/plain').send('Link inválido ou adulterado.');

    try {
      assertAllowedTarget(target);

      // Permite exibir o conteúdo dentro do iframe do frontend
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
      res.setHeader('Referrer-Policy', 'no-referrer');

      const headers = {
        'user-agent': req.get('user-agent') || 'Mozilla/5.0',
        accept: req.get('accept') || '*/*',
        'accept-language': req.get('accept-language') || 'pt-BR,pt;q=0.9,en;q=0.8',
        'accept-encoding': 'identity',
        referer: `${target.origin}/`,
      };
      if (req.get('range')) headers.range = req.get('range');

      const upstream = await undiciFetch(target.href, { headers, redirect: 'manual', dispatcher });
      if (upstream.status >= 400) console.warn('Proxy origem respondeu', upstream.status, target.href);

      if (REDIRECTS.has(upstream.status)) {
        const location = upstream.headers.get('location');
        if (!location) return res.status(502).type('text/plain').send('Redirecionamento inválido.');
        const next = new URL(location, target);
        if (!/^https?:$/.test(next.protocol)) return res.status(502).type('text/plain').send('Redirecionamento inválido.');
        return res.redirect(302, `/p/${makeToken(secret, next.href)}`);
      }

      const type = (upstream.headers.get('content-type') || '').toLowerCase();
      res.status(upstream.status);

      if (type.includes('text/html')) {
        const buffer = await readLimited(upstream);
        const charset = (/charset=([^;]+)/.exec(type) || [])[1] || 'utf-8';
        let html;
        try { html = new TextDecoder(charset.trim()).decode(buffer); } catch { html = buffer.toString('utf8'); }
        res.setHeader('Cache-Control', 'no-store');
        return res.type('text/html; charset=utf-8').send(rewriteHtml(html, target, secret));
      }

      if (type.includes('text/css')) {
        const css = (await readLimited(upstream)).toString('utf8');
        res.setHeader('Cache-Control', 'private, max-age=600');
        return res.type('text/css; charset=utf-8').send(rewriteCss(css, urlRewriter(secret, target)));
      }

      // Demais arquivos (JS, imagens, vídeo, áudio, wasm...) passam direto
      ['content-type', 'content-range', 'accept-ranges', 'last-modified', 'etag'].forEach((h) => {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      });
      if (!upstream.headers.get('content-encoding')) {
        const length = upstream.headers.get('content-length');
        if (length) res.setHeader('content-length', length);
      }
      res.setHeader('Cache-Control', 'private, max-age=600');
      if (!upstream.body) return res.end();

      const stream = Readable.fromWeb(upstream.body);
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      return stream.pipe(res);
    } catch (error) {
      console.error('Proxy:', error.message);
      if (res.headersSent) return res.destroy();
      const status = error.status === 413 ? 413 : 502;
      return res.status(status).type('text/plain').send('Não foi possível carregar este conteúdo pelo proxy.');
    }
  });

  // Caminho codificado (/p/<token>) para salvar junto de cada mídia
  const pathFor = (tipo, url) => {
    if (!secret) return null;
    try { return `/p/${makeToken(secret, embedUrlFor(tipo, url))}`; } catch { return null; }
  };

  return { router, pathFor };
}

module.exports = { createProxy };
