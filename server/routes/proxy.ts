import { Router } from 'express';

export const proxyRouter = Router();

// GET /api/proxy/embed - Proxy for embedding web pages & document viewing
proxyRouter.get('/embed', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    let validatedUrl = targetUrl.trim();
    if (!validatedUrl.startsWith('http://') && !validatedUrl.startsWith('https://')) {
      validatedUrl = `https://${validatedUrl}`;
    }

    const response = await fetch(validatedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseHref = validatedUrl;

      if (!html.includes('<base ') && !html.includes('<BASE ')) {
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head><base href="${baseHref}">`);
        } else if (html.includes('<HEAD>')) {
          html = html.replace('<HEAD>', `<HEAD><base href="${baseHref}">`);
        } else {
          html = `<base href="${baseHref}">${html}`;
        }
      }

      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(html);
    } else {
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error('Embed proxy fetch error:', err.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; color: #334155; background: #f8fafc; }
          .card { max-width: 520px; margin: 40px auto; background: white; padding: 28px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          h3 { color: #0f172a; margin-top: 0; }
          p { font-size: 13px; line-height: 1.6; color: #64748b; }
          .btn { display: inline-block; margin-top: 14px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; }
          .btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>🔗 원본 사이트 직접 열람 안내</h3>
          <p>보안 정책(CORS/X-Frame)으로 인해 인앱 직접 렌더링이 제한되는 외부 웹사이트입니다.</p>
          <p style="font-family: monospace; font-size: 11px; word-break: break-all; background: #f1f5f9; padding: 8px; border-radius: 6px;">${targetUrl}</p>
          <a href="${targetUrl}" target="_blank" rel="noreferrer" class="btn">새 창에서 바로 열기 ↗</a>
        </div>
      </body>
      </html>
    `);
  }
});
