const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/landing_pages.json');
function load() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { pages: [] }; } catch { return { pages: [] }; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function createLandingPage(storeId, title, bodyText, whatsappNumber, options = {}) {
  const data = load();
  const primaryColor = options.primaryColor || '#25D366'; // WhatsApp Green
  const accentColor = options.accentColor || '#128C7E';
  const welcomeText = encodeURIComponent(options.prefilledText || 'Assalam o Alaikum! I am interested in your products.');

  const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primaryColor};
      --accent: ${accentColor};
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      backdrop-filter: blur(10px);
      transition: transform 0.3s ease;
    }
    .container:hover {
      transform: translateY(-5px);
    }
    h1 {
      font-size: 2.2rem;
      margin-bottom: 20px;
      color: #1a1a1a;
      font-weight: 700;
    }
    p {
      font-size: 1.1rem;
      line-height: 1.6;
      color: #666;
      margin-bottom: 35px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--primary);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1.1rem;
      box-shadow: 0 10px 20px rgba(37, 211, 102, 0.3);
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .btn:hover {
      background: var(--accent);
      transform: scale(1.05);
      box-shadow: 0 12px 24px rgba(18, 140, 126, 0.4);
    }
    .btn svg {
      margin-right: 10px;
      width: 24px;
      height: 24px;
      fill: white;
    }
    .footer {
      margin-top: 40px;
      font-size: 0.85rem;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${bodyText}</p>
    <a href="https://wa.me/${whatsappNumber}?text=${welcomeText}" class="btn" target="_blank">
      <svg viewBox="0 0 24 24">
        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.028L2 22l5.176-1.356a9.926 9.926 0 004.82 1.25c5.507 0 9.988-4.477 9.99-9.983A9.994 9.994 0 0012.012 2zm5.782 13.918c-.248.694-1.428 1.348-1.956 1.41-.478.056-1.1.272-3.19-.56-2.673-1.066-4.382-3.792-4.516-3.97-.13-.178-1.082-1.438-1.082-2.744 0-1.306.684-1.948.928-2.213.243-.265.534-.33.712-.33.178 0 .356.002.51.01.162.008.38-.063.593.447.213.51.73 1.776.792 1.905.063.13.104.28.02.447-.082.167-.123.272-.243.414-.123.14-.256.313-.367.42-.123.12-.25.25-.107.497.143.244.636 1.042 1.37 1.696.945.84 1.737 1.1 1.983 1.223.247.123.39.103.535-.063.144-.167.62-.72.785-.964.167-.243.33-.203.555-.122.227.08.1.08 1.442.753 1.343.673 2.235 1.115 2.298 1.222.062.107.062.62-.186 1.314z"/>
      </svg>
      Chat with Us
    </a>
    <div class="footer">
      Powered by SuperSenderPro
    </div>
  </div>
</body>
</html>`;

  const page = {
    id: `LP-${Date.now()}`,
    storeId,
    title,
    bodyText,
    whatsappNumber,
    htmlContent: pageHtml,
    createdAt: new Date().toISOString()
  };
  data.pages.push(page);
  save(data);
  return page;
}

module.exports = { createLandingPage };

