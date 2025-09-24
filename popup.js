var originalLrcContent = '';
var songId = '';
var songTitle = '';
var artistName = '';
var currentLang = 'de'; // Default language

// Language strings
var i18n = {
de: {
title: "LRC zu Lyric Video Konverter 🎤",
subtitle: "LRC-Inhalt wurde automatisch geladen und kann bearbeitet werden",
remove_punctuation: "Satzzeichen löschen (- , ?)",
remove_adlibs: "Adlibs entfernen (alles in Klammern)",
remove_meta_tags: "Meta-Tags entfernen",
to_upper: "ALLES GROSS",
to_lower: "alles klein",
copy_clipboard: "In Zwischenablage kopieren",
download_file: "Datei herunterladen",
close: "Schließen",
download_mp3: "MP3 herunterladen",
error_loading: "Fehler beim Laden der LRC-Daten. Bitte die Seite neu laden.",
no_content: "Kein LRC-Inhalt verfügbar.",
open_song_page: "Bitte öffne eine Suno Song-Seite.",
status_loaded: "LRC geladen!",
status_copied: "Kopiert!",
status_downloaded: "Datei heruntergeladen!",
status_mp3_started: "MP3 Download gestartet!",
status_error: "Fehler",
status_nothing: "Nichts zu kopieren!",
placeholder: "Verarbeite LRC-Inhalt..."
},
en: {
title: "LRC to Lyric Video Converter 🎤",
subtitle: "LRC content loaded automatically and can be edited",
remove_punctuation: "Remove punctuation (- , ?)",
remove_adlibs: "Remove adlibs (content in brackets)",
remove_meta_tags: "Remove meta tags",
to_upper: "UPPERCASE",
to_lower: "lowercase",
copy_clipboard: "Copy to Clipboard",
download_file: "Download File",
close: "Close",
download_mp3: "Download MP3",
error_loading: "Error loading LRC data. Please reload the page.",
no_content: "No LRC content available.",
open_song_page: "Please open a Suno song page.",
status_loaded: "LRC loaded!",
status_copied: "Copied!",
status_downloaded: "File downloaded!",
status_mp3_started: "MP3 download started!",
status_error: "Error",
status_nothing: "Nothing to copy!",
placeholder: "Processing LRC content..."
}
};

// Array mit allen Satzzeichen, die entfernt werden sollen
var PUNCTUATION_TO_REMOVE = [
    '-', ',', '?', '*', '"', '–', '!', '„', '"',
    '.', ':','‘','\'','’ ','“','”',
    ';', '¿', '¡', '…', '—', '(', ')', '[', ']', '{', '}', '/', '\\',
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
document.getElementById('closeButton').addEventListener('click', function() { window.close(); });
document.getElementById('downloadMp3Button').addEventListener('click', downloadMp3);

// Checkbox event listeners
var checkboxIds = ['removePunct','removeAdlibs','removeMetaTags','toUpper','toLower'];
for (var i = 0; i < checkboxIds.length; i++) {
    document.getElementById(checkboxIds[i]).addEventListener('change', function() {
        if (originalLrcContent) {
            var convertedText = convertLrc(originalLrcContent);
            document.getElementById('output').value = convertedText;
        }
    });
}

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
                
                var convertedText = convertLrc(originalLrcContent);
                document.getElementById('output').value = convertedText;
                showStatus(i18n[currentLang].status_loaded, 'success');
                
                // Enable the MP3 button
                document.getElementById('downloadMp3Button').disabled = false;
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
var removePunct = document.getElementById('removePunct').checked;
var removeAdlibs = document.getElementById('removeAdlibs').checked;
var removeMetaTags = document.getElementById('removeMetaTags').checked;
var toUpper = document.getElementById('toUpper').checked;
var toLower = document.getElementById('toLower').checked;

for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmedLine = line.trim();
    
    if (trimmedLine === '') {
        if (currentVerse.length > 0) {
            var verseText = currentVerse.join(' ').trim();

            if (removeAdlibs) {
                verseText = verseText.replace(/KATEX_INLINE_OPEN[^)]*KATEX_INLINE_CLOSE/g, '').trim();
            }
            
            if (removePunct) {
                verseText = removePunctuation(verseText);
            }
            
            if (toUpper) verseText = verseText.toUpperCase();
            if (toLower) verseText = verseText.toLowerCase();

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
            timeMatches.push({'1': content});
            textPart = textPart.substring(0, openBracketPos) + textPart.substring(closeBracketPos + 1);
            pos = openBracketPos;
        } else {
            textPart = textPart.substring(0, openBracketPos) + textPart.substring(closeBracketPos + 1);
            pos = openBracketPos;
        }
    }
    
    textPart = textPart.trim();

    if (timeMatches.length > 0) {
        lastTimestamp = timeMatches[0]['1'];
        if (firstTimestamp === '') firstTimestamp = lastTimestamp;
    }

    if (textPart) {
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
    
    if (removeAdlibs) {
        verseText = verseText.replace(/KATEX_INLINE_OPEN[^)]*KATEX_INLINE_CLOSE/g, '').trim();
    }
    
    if (removePunct) {
        verseText = removePunctuation(verseText);
    }
    
    if (toUpper) verseText = verseText.toUpperCase();
    if (toLower) verseText = verseText.toLowerCase();
    
    result += '[' + firstTimestamp + ']' + verseText + '\n';
}

return result.trim();
}

// Function to copy to clipboard
function copyToClipboard() {
var outputArea = document.getElementById('output');
if(outputArea.value && outputArea.value !== i18n[currentLang].no_content && outputArea.value !== i18n[currentLang].open_song_page) {
navigator.clipboard.writeText(outputArea.value).then(function() {
showStatus(i18n[currentLang].status_copied, 'success');
}).catch(function() {
showStatus(i18n[currentLang].status_error, 'error');
});
} else {
showStatus(i18n[currentLang].status_nothing, 'error');
}
}

// Function to show status
function showStatus(message, type) {
var statusDiv = document.getElementById('statusMessage');
statusDiv.textContent = message;
statusDiv.className = 'status ' + type;
statusDiv.style.display = 'block';
setTimeout(function() {
    statusDiv.style.display = 'none';
}, 3000);
}