import fetch from 'node-fetch';

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function extractVideoUrl(html) {
  const sources = html.match(/sources:\s*\[(.*?)\]/s);
  if (sources && sources[1]) {
    const urlMatch = sources[1].match(/["'](https?:\/\/[^"']+)["']/);
    return urlMatch ? urlMatch[1] : null;
  }
  return null;
}

export async function handler(event) {
  // Configurer les en-têtes CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gérer les requêtes OPTIONS (pre-flight)
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
        body: JSON.stringify({ error: 'ID vidéo manquant' })
      };
    }

    const embedUrl = `https://uqload.net/embed-${id}.html`;
    const response = await fetch(embedUrl);
    const html = await response.text();

    const videoUrl = extractVideoUrl(html);

    if (!videoUrl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'URL vidéo non trouvée' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        videoUrl,
        type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4'
      })
    };

  } catch (error) {
    console.error('Erreur proxy:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
} 