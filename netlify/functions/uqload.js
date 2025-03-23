import fetch from 'node-fetch';

function decodeHTML(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'");
}

async function extractVideoUrl(html) {
  const patterns = [
    /sources:\s*\[\s*{\s*file:\s*["']([^"']+)["']/i,
    /player\.src\(\s*{\s*sources:\s*\[\s*{\s*src:\s*["']([^"']+)["']/i,
    /source\s+src="([^"]+)"/i,
    /file:\s*"([^"]+)"/,
    /<script>[^<]*sources\s*:\s*\[{file:"([^"]+)"/,
  ];

  const scriptMatch = html.match(/<script>\s*var\s+player\s*=\s*([^<]+)<\/script>/i);
  if (scriptMatch) {
    const playerConfig = scriptMatch[1];
    const urlMatch = playerConfig.match(/file:\s*["']([^"']+)["']/i);
    if (urlMatch) {
      return decodeHTML(urlMatch[1]);
    }
  }

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const url = decodeHTML(match[1].trim());
      if (url.startsWith("http")) {
        return url;
      }
    }
  }
  return null;
}

export async function handler(event) {
  // Activer CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Gérer les requêtes OPTIONS pour CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    const { id } = event.queryStringParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "ID vidéo manquant" })
      };
    }

    const embedUrl = `https://uqload.net/embed-${id}.html`;
    console.log("Fetching URL:", embedUrl);

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        'Referer': 'https://uqload.net/'
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Erreur de récupération: ${response.status}` })
      };
    }

    const html = await response.text();

    if (html.includes("File was deleted") || html.includes("File not found")) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "La vidéo n'est plus disponible" })
      };
    }

    const videoUrl = await extractVideoUrl(html);

    if (!videoUrl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "URL vidéo non trouvée" })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        videoUrl,
        type: videoUrl.includes(".m3u8") ? "hls" : "mp4"
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Erreur interne du serveur",
        details: error.message
      })
    };
  }
} 