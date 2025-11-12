var originalLrcContent = '';
var songId = '';
var songTitle = '';
var artistName = '';
var currentLang = 'de'; // Default language

// Language strings
var i18n = {
de: {
title: "Fightclub SUNO Tool 🎤",
subtitle: "Welcome to the Fighclub!",
remove_punctuation: "Satzzeichen entfernen",
to_upper: "ALLES GROSS",
to_lower: "alles klein",
copy_clipboard: "Lyrics kopieren",
download_file: "Lyrics herunterladen",
download_mp3: "Audio",
download_cover: "Cover",
download_video: "Video",
error_loading: "Fehler beim Laden der Daten. Bitte die Seite neu laden.",
no_content: "Kein Inhalt verfügbar.",
open_song_page: "Kein Song gefunden. Bitte öffne eine Hurensuno Song-Seite.",
status_loaded: "Lyrics geladen",
status_copied: "Lyrics in die Zwischenablage kopiert",
status_downloaded: "Datei heruntergeladen",
status_mp3_started: "Download gestartet",
status_error: "Unbekannter Fehler",
status_nothing: "Es gibt nichts zu kopieren, Hurensohn!",
placeholder: "Lade Lyrics, Hurensohn!"
},
en: {
title: "Fightclub SUNO Tool 🎤",
subtitle: "Welcome to the Fighclub!",
remove_punctuation: "Remove punctuation",
to_upper: "UPPERCASE",
to_lower: "lowercase",
copy_clipboard: "Copy Lyrics",
download_file: "Download Lyrics",
download_mp3: "Audio",
download_cover: "Cover",
download_video: "Video",
error_loading: "Error loading data. Please reload the page.",
no_content: "No content available.",
open_song_page: "No Song found. Please open a Hurensuno song page.",
status_loaded: "Lyrics loaded",
status_copied: "Lyrics copied",
status_downloaded: "File downloaded",
status_mp3_started: "MP3 download started!",
status_error: "Unknown Error",
status_nothing: "Nothing to copy, motherfucker!",
placeholder: "Processing Lyrics, bitch!"
}
};

// Array mit allen Satzzeichen, die entfernt werden sollen
var PUNCTUATION_TO_REMOVE = [
    '-', ',', '?', '*', '"', '–', '!', '„', '"',
    '.', ':','"','"',
    ';', '¿', '¡', '…', '—', '(', ')', '{', '}', '/', '\\',
    '«', '»', '‹', '›', '〈', '〉', '《', '》', '【', '】', '〔', '〕'
];
// Function to translate the interface
function translateInterface(lang) {
currentLang = lang;
// Save language preference
localStorage.setItem('suno-lyrics-lang', lang);

// Update all elements with data-i18n attribute
document.querySelectorAll('[data-i18n]').forEach(function(element) {
    var key = element.getAttribute('data-i18n');
    if (i18n[lang][key]) {
        element.textContent = i18n[lang][key];
    }
});

// Update placeholder
document.querySelectorAll('[data-i18n-placeholder]').forEach(function(element) {
    var key = element.getAttribute('data-i18n-placeholder');
    if (i18n[lang][key]) {
        element.placeholder = i18n[lang][key];
    }
});

// Update language buttons
document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
    }
});
}

// Function to remove punctuation
function removePunctuation(text) {
var result = text;
for (var i = 0; i < PUNCTUATION_TO_REMOVE.length; i++) {
var char = PUNCTUATION_TO_REMOVE[i];
while (result.indexOf(char) !== -1) {
result = result.replace(char, ' ');
}
}
result = result.replace(/\s+/g, ' ').trim();
return result;
}

document.addEventListener('DOMContentLoaded', function() {
// Load saved language preference
var savedLang = localStorage.getItem('suno-lyrics-lang') || 'de';
translateInterface(savedLang);
// Language switcher
document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var lang = this.getAttribute('data-lang');
        translateInterface(lang);
    });
});

// Button event listeners
document.getElementById('copyButton').addEventListener('click', copyToClipboard);
document.getElementById('downloadButton').addEventListener('click', downloadResult);
document.getElementById('closeButton').addEventListener('click', function() {
    window.close();
});
document.getElementById('downloadMp3Button').addEventListener('click', downloadMp3);
document.getElementById('downloadCoverButton').addEventListener('click', downloadCover);
document.getElementById('downloadVideoButton').addEventListener('click', downloadVideo);

// Option button event listeners
var optionIds = ['removePunct', 'toUpper', 'toLower'];
optionIds.forEach(function(id) {
    var button = document.getElementById(id);
    if (button) {
        button.addEventListener('click', function() {
            // Toggle the active state
            var currentState = this.getAttribute('data-active') === 'true';
            this.setAttribute('data-active', !currentState);
            
            // Update the text if we have content
            if (originalLrcContent) {
                var convertedText = convertLrc(originalLrcContent);
                document.getElementById('output').value = convertedText;
            }
        });
    }
});

// Listen for runtime messages (e.g. content script notifying that a video URL returned XML/error)
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.action === 'VIDEO_INVALID') {
        console.log('Popup received VIDEO_INVALID message:', message);
        // Only act if the message applies to the currently loaded song
        if (message.songId && message.songId === songId) {
            window.mediaUrls = window.mediaUrls || {};
            window.mediaUrls.video = '';
            var btn = document.getElementById('downloadVideoButton');
            if (btn) {
                btn.disabled = true;
                btn.title = i18n[currentLang].status_error;
            }
            showStatus(i18n[currentLang].status_error, 'error');
        }
        showStatus(i18n[currentLang].status_error, 'error');
    }
});

// Get the active tab and request LRC data
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('suno.com/song/')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "GET_LRC_DATA"}, function(response) {
            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError);
                document.getElementById('output').value = i18n[currentLang].error_loading;
                showStatus(i18n[currentLang].status_error, 'error');
                return;
            }
            
            if (response && response.lrcContent) {
                originalLrcContent = response.lrcContent;
                songId = response.songId;
                songTitle = response.title || 'Unknown Title';
                artistName = response.artist || 'Unknown Artist';
                
                // Store media URLs if available and manage button states
                if (response.mediaUrls) {
                    window.mediaUrls = response.mediaUrls;
                    console.log('[Button State] Stored media URLs:', window.mediaUrls);
                    
                    // Enable/disable buttons based on media availability
                    document.getElementById('downloadMp3Button').disabled = false;
                    document.getElementById('downloadCoverButton').disabled = !window.mediaUrls.image;
                    
                    var videoUrlPresent = !!window.mediaUrls.video;
                    // Keep video button disabled until we confirm video is accessible (no flickering)
                    document.getElementById('downloadVideoButton').disabled = true;
                    
                    console.log('[Button State] Initial button states:', {
                        mp3: true,
                        cover: !!window.mediaUrls.image,
                        video: 'checking...',
                        videoUrl: window.mediaUrls.video
                    });
                    
                    // Check video accessibility asynchronously if URL is present
                    if (videoUrlPresent) {
                        // Set tooltip to indicate checking
                        document.getElementById('downloadVideoButton').title = 'Checking video availability...';
                        
                        checkVideoAvailability(window.mediaUrls.video).then(function(isVideoAccessible) {
                            console.log('[Video Check] Video accessibility result:', isVideoAccessible);
                            
                            var videoButton = document.getElementById('downloadVideoButton');
                            videoButton.disabled = !isVideoAccessible;
                            
                            if (!isVideoAccessible) {
                                videoButton.title = 'Video file not accessible or does not exist';
                                showStatus('Video file not accessible for this song', 'error');
                            } else {
                                videoButton.title = i18n[currentLang].download_video;
                                console.log('[Button State] Video button enabled - video is accessible');
                            }
                        }).catch(function(error) {
                            console.error('[Video Check] Video accessibility check failed:', error);
                            document.getElementById('downloadVideoButton').disabled = true;
                            document.getElementById('downloadVideoButton').title = 'Video accessibility check failed';
                        });
                    } else {
                        // No video URL present
                        document.getElementById('downloadVideoButton').title = 'No video URL available';
                    }
                    
                    // Update other button tooltips
                    if (!window.mediaUrls.image) {
                        document.getElementById('downloadCoverButton').title = i18n[currentLang].status_error;
                    }
                    if (!videoUrlPresent) {
                        document.getElementById('downloadVideoButton').title = 'No video URL available';
                    }
                } else {
                    console.log('[Button State] No media URLs in response:', response);
                    // Disable media buttons if no URLs available
                    document.getElementById('downloadCoverButton').disabled = true;
                    document.getElementById('downloadVideoButton').disabled = true;
                }
                
                var convertedText = convertLrc(originalLrcContent);
                document.getElementById('output').value = convertedText;
                showStatus(i18n[currentLang].status_loaded, 'success');
            } else {
                document.getElementById('output').value = i18n[currentLang].no_content;
                showStatus(i18n[currentLang].no_content, 'error');
            }
        });
    } else {
        document.getElementById('output').value = i18n[currentLang].open_song_page;
        showStatus(i18n[currentLang].open_song_page, 'info');
    }
});
});

// Function to clean filename
function cleanFilename(filename) {
return filename
.replace(/[<>:"/\|?*]/g, '')
.replace(/\s+/g, ' ')
.trim();
}

// Function to clean lyrics text
// Function to remove square brackets (always applied first)
function removeBrackets(text) {
    return text.replace(/\[[^\]]*\]/g, ''); // Remove ALL square brackets and their contents
}

function cleanLyricsText(text) {
    return text
        .replace(/([\(])\s+/g, '$1') // remove space directly after opening brackets: (
        .replace(/„ +/g, '„')  // Remove spaces after German quotes
        .replace(/" +/g, '"')  // Remove spaces after double quotes
        .replace(/’ +/g, '’')  // Remove spaces after single quotes
        .replace(/\s+/g, ' ')  // Normalize other spaces
        .trim();
}

// Function to check if video URL is actually accessible
async function checkVideoAvailability(videoUrl) {
    if (!videoUrl || videoUrl.trim() === '') {
        console.log('[Video Check] No video URL provided');
        return false;
    }
    
    try {
        console.log('[Video Check] Testing video accessibility:', videoUrl);
        
        // Try to fetch with a HEAD request to check if the resource exists
        const response = await fetch(videoUrl, {
            method: 'HEAD',
            mode: 'no-cors'  // This will succeed but we won't get response details
        });
        
        // Since no-cors doesn't give us status, try a different approach
        // Create an img or video element and see if it loads
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.style.display = 'none';
            
            const timeout = setTimeout(() => {
                document.body.removeChild(video);
                console.log('[Video Check] Video check timed out - assuming not available');
                resolve(false);
            }, 5000); // 5 second timeout
            
            video.onloadedmetadata = () => {
                clearTimeout(timeout);
                document.body.removeChild(video);
                console.log('[Video Check] Video metadata loaded - video appears available');
                resolve(true);
            };
            
            video.onerror = () => {
                clearTimeout(timeout);
                document.body.removeChild(video);
                console.log('[Video Check] Video failed to load - not available');
                resolve(false);
            };
            
            document.body.appendChild(video);
            video.src = videoUrl;
        });
        
    } catch (error) {
        console.log('[Video Check] Video accessibility check failed:', error);
        return false;
    }
}

// Function to add vizzy workaround (duplicate last line with +2 seconds)
function addVizzyWorkaround(lrcContent) {
    if (!lrcContent || !lrcContent.trim()) return lrcContent;
    
    var lines = lrcContent.trim().split('\n');
    if (lines.length === 0) return lrcContent;
    
    var lastLine = lines[lines.length - 1];
    var timestampMatch = lastLine.match(/^\[(\d{2}):(\d{2})\.(\d{2})\]/);
    
    if (!timestampMatch) return lrcContent;
    
    var minutes = parseInt(timestampMatch[1], 10);
    var seconds = parseInt(timestampMatch[2], 10);
    var milliseconds = parseInt(timestampMatch[3], 10);
    
    // Add 2 seconds
    seconds += 2;
    if (seconds >= 60) {
        minutes += Math.floor(seconds / 60);
        seconds = seconds % 60;
    }
    
    // Format new timestamp with same format (2-digit milliseconds)
    var newTimestamp = String(minutes).padStart(2, '0') + ':' + 
                      String(seconds).padStart(2, '0') + '.' + 
                      String(milliseconds).padStart(2, '0');
    
    var duplicatedLine = lastLine.replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '[' + newTimestamp + ']');
    
    return lrcContent + '\n' + duplicatedLine;
}

// Function to download MP3
function downloadMp3() {
if (!songId) {
showStatus(i18n[currentLang].status_error, 'error');
return;
}
var mp3Url = 'https://cdn1.suno.ai/' + songId + '.mp3';
var filename = cleanFilename(artistName + ' - ' + songTitle) + '.mp3';

chrome.downloads.download({
    url: mp3Url,
    filename: filename,
    saveAs: false
}, function(downloadId) {
    if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        showStatus(i18n[currentLang].status_error, 'error');
    } else {
        showStatus(i18n[currentLang].status_mp3_started, 'success');
    }
});
}

// Function to download LRC file
function downloadResult() {
var textToSave = document.getElementById('output').value;
if (!textToSave || textToSave === i18n[currentLang].no_content || textToSave === i18n[currentLang].open_song_page) {
showStatus(i18n[currentLang].status_nothing, 'error');
return;
}
// Apply vizzy workaround before saving
textToSave = addVizzyWorkaround(textToSave);
var filename = cleanFilename(artistName + ' - ' + songTitle) + '.lrc';
var blob = new Blob([textToSave], { type: 'text/plain' });
var url = URL.createObjectURL(blob);
var a = document.createElement('a');

a.style.display = 'none';
a.href = url;
a.download = filename;

document.body.appendChild(a);
a.click();

window.URL.revokeObjectURL(url);
document.body.removeChild(a);

showStatus(i18n[currentLang].status_downloaded, 'success');
}

// Function to convert LRC
function convertLrc(lrcContent) {
var lines = lrcContent.split('\n');
var result = '';
var currentVerse = [];
var firstTimestamp = '';
var lastTimestamp = '';
var removePunct = document.getElementById('removePunct').getAttribute('data-active') === 'true';
var toUpper = document.getElementById('toUpper').getAttribute('data-active') === 'true';
var toLower = document.getElementById('toLower').getAttribute('data-active') === 'true';

for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmedLine = line.trim();
    
    if (trimmedLine === '') {
        if (currentVerse.length > 0) {
            var verseText = currentVerse.join(' ').trim();

            // ALWAYS remove brackets first, before any other processing
            verseText = removeBrackets(verseText);

            if (removePunct) {
                verseText = removePunctuation(verseText);
            }
            
            if (toUpper) verseText = verseText.toUpperCase();
            if (toLower) verseText = verseText.toLowerCase();
            
            verseText = cleanLyricsText(verseText);
            result += '[' + firstTimestamp + ']' + verseText + '\n';
            currentVerse = [];
            firstTimestamp = '';
        }
        continue;
    }

    var timeMatches = [];
    var textPart = line;
    var pos = 0;
    
    while (pos < textPart.length) {
        var openBracketPos = textPart.indexOf('[', pos);
        if (openBracketPos === -1) break;
        
        var closeBracketPos = textPart.indexOf(']', openBracketPos);
        if (closeBracketPos === -1) break;
        
        var content = textPart.substring(openBracketPos + 1, closeBracketPos);
        
        if (/^\d{2}:\d{2}\.\d{2,3}$/.test(content)) {
            // This is a timestamp - keep it for timing
            timeMatches.push({'1': content});
        }
        // Remove ALL square brackets and their contents (timestamps and any other content)
        textPart = textPart.substring(0, openBracketPos) + textPart.substring(closeBracketPos + 1);
        pos = openBracketPos;
    }
    
    textPart = textPart.trim();

    if (timeMatches.length > 0) {
        lastTimestamp = timeMatches[0]['1'];
        if (firstTimestamp === '') firstTimestamp = lastTimestamp;
    }

    if (textPart) {
        // ALWAYS remove brackets first, before any other processing
        textPart = removeBrackets(textPart);
        
        if (removePunct) {
            textPart = removePunctuation(textPart);
        }
        if (toUpper) textPart = textPart.toUpperCase();
        if (toLower) textPart = textPart.toLowerCase();

        if (textPart) currentVerse.push(textPart);
    }
}

if (currentVerse.length > 0) {
    var verseText = currentVerse.join(' ').trim();
    
    // ALWAYS remove brackets first, before any other processing
    verseText = removeBrackets(verseText);
    
    if (removePunct) {
        verseText = removePunctuation(verseText);
    }
    
    if (toUpper) verseText = verseText.toUpperCase();
    if (toLower) verseText = verseText.toLowerCase();
    
    verseText = cleanLyricsText(verseText);
    result += '[' + firstTimestamp + ']' + verseText + '\n';
}

return result.trim();
}

// Function to copy to clipboard
function copyToClipboard() {
var outputArea = document.getElementById('output');
if(outputArea.value && outputArea.value !== i18n[currentLang].no_content && outputArea.value !== i18n[currentLang].open_song_page) {
// Apply vizzy workaround before copying
var textToCopy = addVizzyWorkaround(outputArea.value);
navigator.clipboard.writeText(textToCopy).then(function() {
showStatus(i18n[currentLang].status_copied, 'success');
}).catch(function() {
showStatus(i18n[currentLang].status_error, 'error');
});
} else {
showStatus(i18n[currentLang].status_nothing, 'error');
}
}

// Function to download cover image
function downloadCover() {
    console.log('Download cover clicked. State:', {
        hasSongId: !!songId,
        hasMediaUrls: !!window.mediaUrls,
        mediaUrls: window.mediaUrls,
        imageUrl: window.mediaUrls?.image
    });

    if (!songId || !window.mediaUrls?.image) {
        console.error('Cannot download cover: missing songId or image URL');
        showStatus(i18n[currentLang].status_error, 'error');
        return;
    }
    var filename = cleanFilename(artistName + ' - ' + songTitle) + ' (Cover).jpg';

    console.log('Starting cover download:', {
        url: window.mediaUrls.image,
        filename: filename
    });

    chrome.downloads.download({
        url: window.mediaUrls.image,
        filename: filename,
        saveAs: false
    }, function(downloadId) {
        if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            showStatus(i18n[currentLang].status_error, 'error');
        } else {
            console.log('Cover download started with ID:', downloadId);
            showStatus(i18n[currentLang].status_downloaded, 'success');
        }
    });
}

// Function to download cover video
function downloadVideo() {
    console.log('Download video clicked. State:', {
        hasSongId: !!songId,
        hasMediaUrls: !!window.mediaUrls,
        mediaUrls: window.mediaUrls,
        videoUrl: window.mediaUrls?.video
    });

    if (!songId || !window.mediaUrls?.video) {
        console.error('Cannot download video: missing songId or video URL');
        showStatus(i18n[currentLang].status_error, 'error');
        return;
    }
    var filename = cleanFilename(artistName + ' - ' + songTitle) + ' (Video).mp4';

    console.log('Starting video download:', {
        url: window.mediaUrls.video,
        filename: filename
    });

    chrome.downloads.download({
        url: window.mediaUrls.video,
        filename: filename,
        saveAs: false
    }, function(downloadId) {
        if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            showStatus(i18n[currentLang].status_error, 'error');
        } else {
            console.log('Video download started with ID:', downloadId);
            showStatus(i18n[currentLang].status_downloaded, 'success');
        }
    });
}

// Function to log status (replaces visual status with console debug)
function showStatus(message, type) {
    console.debug('[Suno Extension] ' + (type || 'info').toUpperCase() + ': ' + (message || ''));
}