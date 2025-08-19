/**
 * Media utilities for handling embedded media links
 */

/**
 * Extract Spotify track ID from various Spotify URL formats
 * @param {string} url - Spotify URL
 * @returns {string|null} - Spotify track ID or null if invalid
 */
function extractSpotifyTrackId(url) {
  if (!url) return null;
  
  // Handle various Spotify URL formats
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify\.com\/embed\/track\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - YouTube video ID or null if invalid
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract SoundCloud track ID from SoundCloud URL
 * @param {string} url - SoundCloud URL
 * @returns {string|null} - SoundCloud track ID or null if invalid
 */
function extractSoundCloudTrackId(url) {
  if (!url) return null;
  
  // Handle various SoundCloud URL formats
  const patterns = [
    /soundcloud\.com\/([^\/\?]+)\/([^\/\?]+)/,  // artist/track format like "forss/flickermood"
    /soundcloud\.com\/([^\/\?]+)/                 // just artist format
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // Return the full path (artist/track or just artist)
      return match[0].replace('https://', '').replace('http://', '');
    }
  }
  
  return null;
}

/**
 * Validate and process embedded media URL
 * @param {string} url - Media URL
 * @param {string} type - Media type ('spotify', 'youtube', 'soundcloud')
 * @returns {object|null} - Processed media object or null if invalid
 */
function validateAndProcessMedia(url, type) {
  if (!url || !type) return null;
  
  let mediaId = null;
  let embedUrl = null;
  
  switch (type) {
    case 'spotify':
      mediaId = extractSpotifyTrackId(url);
      if (mediaId) {
        embedUrl = `https://open.spotify.com/embed/track/${mediaId}`;
      }
      break;
      
    case 'youtube':
      mediaId = extractYouTubeVideoId(url);
      if (mediaId) {
        embedUrl = `https://www.youtube.com/embed/${mediaId}`;
      }
      break;
      
    case 'soundcloud':
      mediaId = extractSoundCloudTrackId(url);
      if (mediaId) {
        embedUrl = `https://w.soundcloud.com/player/?url=https://${mediaId}`;
      }
      break;
      
    default:
      return null;
  }
  
  if (!mediaId) {
    return null;
  }
  
  return {
    originalUrl: url,
    mediaId: mediaId,
    embedUrl: embedUrl,
    type: type
  };
}

/**
 * Generate embed HTML for media
 * @param {object} media - Media object from validateAndProcessMedia
 * @returns {string} - HTML embed code
 */
function generateEmbedHtml(media) {
  if (!media) return '';
  
  switch (media.type) {
    case 'spotify':
      return `<iframe style="border-radius:12px" src="${media.embedUrl}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
      
    case 'youtube':
      return `<iframe width="100%" height="315" src="${media.embedUrl}" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>`;
      
    case 'soundcloud':
      return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="${media.embedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`;
      
    default:
      return '';
  }
}

/**
 * Detect media type from URL
 * @param {string} url - Media URL
 * @returns {string|null} - Detected media type or null
 */
function detectMediaType(url) {
  if (!url) return null;
  
  if (url.includes('spotify.com') || url.includes('open.spotify.com')) {
    return 'spotify';
  }
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  
  if (url.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  
  return null;
}

/**
 * Validate media URL format
 * @param {string} url - Media URL
 * @param {string} type - Expected media type
 * @returns {boolean} - True if valid
 */
function validateMediaUrl(url, type) {
  if (!url || !type) return false;
  
  const processed = validateAndProcessMedia(url, type);
  return processed !== null;
}

module.exports = {
  extractSpotifyTrackId,
  extractYouTubeVideoId,
  extractSoundCloudTrackId,
  validateAndProcessMedia,
  generateEmbedHtml,
  detectMediaType,
  validateMediaUrl
};
