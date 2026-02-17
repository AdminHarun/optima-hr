# 🚀 PHASE 6: KULLANICI DENEYİMİ İYİLEŞTİRMELERİ
## PWA, Keyboard Shortcuts, Rich Text Editor (2 hafta)

---

## 📌 TASK 6.1: PWA & OFFLINE MODU

### 🤖 Claude Prompt

```
GÖREV: Progressive Web App (PWA) ve offline çalışma modu ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Tarayıcı "app olarak kur" desteği ve offline çalışma

SERVICE WORKER:

```javascript
// frontend/public/service-worker.js
const CACHE_NAME = 'optima-hr-v1';
const OFFLINE_URL = '/offline.html';

const CACHE_URLS = [
  '/',
  '/offline.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/logo3.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  const db = await openIndexedDB();
  const messages = await db.getAll('pending_messages');
  
  for (const message of messages) {
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      await db.delete('pending_messages', message.id);
    } catch (error) {
      console.error('Failed to sync message:', error);
    }
  }
}
```

MANIFEST.JSON:

```json
{
  "name": "Optima HR",
  "short_name": "Optima",
  "description": "İnsan Kaynakları Yönetim Sistemi",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1c61ab",
  "theme_color": "#1c61ab",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/logo3.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Chat",
      "url": "/chat",
      "description": "Mesajlaşma"
    },
    {
      "name": "Tasks",
      "url": "/tasks",
      "description": "Görevler"
    }
  ]
}
```

INDEXEDDB - OFFLINE STORAGE:

```javascript
// frontend/src/utils/offlineStorage.js
import { openDB } from 'idb';

const DB_NAME = 'optima-offline';
const DB_VERSION = 1;

export async function initDB() {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pending_messages')) {
        db.createObjectStore('pending_messages', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached_messages')) {
        db.createObjectStore('cached_messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_users')) {
        db.createObjectStore('cached_users', { keyPath: 'employee_id' });
      }
    }
  });
}

export async function savePendingMessage(message) {
  const db = await initDB();
  await db.add('pending_messages', message);
}

export async function cacheMessages(roomId, messages) {
  const db = await initDB();
  for (const msg of messages) {
    await db.put('cached_messages', { ...msg, roomId });
  }
}

export async function getCachedMessages(roomId) {
  const db = await initDB();
  const allMessages = await db.getAll('cached_messages');
  return allMessages.filter(msg => msg.roomId === roomId);
}
```

FRONTEND INTEGRATION:

```jsx
// frontend/src/App.js
import { useEffect, useState } from 'react';
import { initDB, savePendingMessage } from './utils/offlineStorage';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Service worker kaydet
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }

    // IndexedDB başlat
    initDB();

    // Online/offline durumu dinle
    window.addEventListener('online', () => {
      setIsOnline(true);
      // Background sync tetikle
      if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-messages');
        });
      }
    });

    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  return (
    <div>
      {!isOnline && (
        <div className="offline-banner">
          ⚠️ İnternet bağlantısı yok. Offline moddasınız.
        </div>
      )}
      {/* ... */}
    </div>
  );
}
```

BEKLENEN ÇIKTI:
- PWA manifest ve service worker
- "App olarak kur" butonu (tarayıcıda)
- Offline mesaj gönderme (kuyrukta bekler)
- Online olunca otomatik sync
- Cached data ile offline görüntüleme
```

---

## 📌 TASK 6.2: KEYBOARD SHORTCUTS

### 🤖 Claude Prompt

```
GÖREV: Klavye kısayolları sistemi (Slack tarzı)

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Ctrl+K (arama), Ctrl+/ (shortcuts listesi), ESC (close), vb.

FRONTEND:

```jsx
// frontend/src/hooks/useKeyboardShortcuts.js
import { useEffect } from 'react';

const shortcuts = {
  // Navigation
  'ctrl+k': { action: 'openSearch', description: 'Global arama' },
  'ctrl+shift+k': { action: 'openChannels', description: 'Kanal listesi' },
  'ctrl+shift+d': { action: 'openDMs', description: 'Direkt mesajlar' },
  
  // Actions
  'ctrl+n': { action: 'newMessage', description: 'Yeni mesaj' },
  'ctrl+shift+a': { action: 'openAllUnreads', description: 'Tüm okunmamışlar' },
  'ctrl+shift+t': { action: 'openThreads', description: 'Thread\'ler' },
  
  // Message actions
  'ctrl+shift+\\': { action: 'toggleSidebar', description: 'Sidebar aç/kapat' },
  'esc': { action: 'closeModal', description: 'Modal/dialog kapat' },
  
  // Formatting
  'ctrl+b': { action: 'bold', description: 'Kalın' },
  'ctrl+i': { action: 'italic', description: 'İtalik' },
  'ctrl+shift+x': { action: 'strikethrough', description: 'Üstü çizili' },
  'ctrl+shift+c': { action: 'code', description: 'Kod bloğu' },
  
  // Misc
  'ctrl+/': { action: 'showShortcuts', description: 'Kısayollar listesi' }
};

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = [];
      if (e.ctrlKey || e.metaKey) key.push('ctrl');
      if (e.shiftKey) key.push('shift');
      if (e.altKey) key.push('alt');
      key.push(e.key.toLowerCase());
      
      const combo = key.join('+');
      const shortcut = shortcuts[combo];
      
      if (shortcut && handlers[shortcut.action]) {
        e.preventDefault();
        handlers[shortcut.action]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

export { shortcuts };
```

SHORTCUTS MODAL:

```jsx
// frontend/src/components/KeyboardShortcutsModal.js
import { Dialog, DialogTitle, DialogContent, List, ListItem, Typography } from '@mui/material';
import { shortcuts } from '../hooks/useKeyboardShortcuts';

const KeyboardShortcutsModal = ({ open, onClose }) => {
  const formatKey = (combo) => {
    return combo
      .split('+')
      .map(key => key === 'ctrl' ? '⌘' : key.toUpperCase())
      .join(' + ');
  };

  const groupedShortcuts = Object.entries(shortcuts).reduce((acc, [combo, { action, description }]) => {
    const category = action.startsWith('open') ? 'Navigation' :
                    action.startsWith('new') ? 'Actions' :
                    ['bold', 'italic', 'strikethrough', 'code'].includes(action) ? 'Formatting' :
                    'Misc';
    
    if (!acc[category]) acc[category] = [];
    acc[category].push({ combo, description });
    return acc;
  }, {});

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Klavye Kısayolları</DialogTitle>
      <DialogContent>
        {Object.entries(groupedShortcuts).map(([category, items]) => (
          <div key={category} className="mb-6">
            <Typography variant="h6" className="mb-2">{category}</Typography>
            <List>
              {items.map(({ combo, description }) => (
                <ListItem key={combo} className="flex justify-between">
                  <Typography>{description}</Typography>
                  <kbd className="px-2 py-1 bg-gray-200 rounded">{formatKey(combo)}</kbd>
                </ListItem>
              ))}
            </List>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
```

APP INTEGRATION:

```jsx
// frontend/src/App.js
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';

function App() {
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcuts({
    openSearch: () => setShowSearch(true),
    showShortcuts: () => setShowShortcuts(true),
    closeModal: () => {
      setShowSearch(false);
      setShowShortcuts(false);
    }
    // ... diğer handler'lar
  });

  return (
    <>
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {/* ... */}
    </>
  );
}
```

BEKLENEN ÇIKTI:
- Klavye kısayolları çalışıyor
- Ctrl+K ile arama
- Ctrl+/ ile kısayollar modal'ı
- ESC ile modal kapatma
- Formatting shortcuts (Ctrl+B, Ctrl+I)
```

---

## 📌 TASK 6.3: ZENGİN METİN EDİTÖRÜ (MARKDOWN/WYSIWYG)

### 🤖 Claude Prompt

```
GÖREV: Mesaj input'una zengin metin editörü ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Markdown desteği + WYSIWYG editor

FRONTEND:

Kütüphane: Lexical (Meta/Facebook'un editörü) veya Tiptap

```jsx
// frontend/src/components/chat/RichTextComposer.js
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';

const theme = {
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  code: 'editor-code',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2'
  },
  list: {
    ul: 'editor-list-ul',
    ol: 'editor-list-ol'
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code'
  }
};

const editorConfig = {
  theme,
  nodes: [
    HeadingNode,
    QuoteNode,
    CodeNode,
    LinkNode,
    ListNode,
    ListItemNode
  ],
  onError: (error) => console.error(error)
};

const RichTextComposer = ({ onSubmit }) => {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="editor-container">
        <ToolbarPlugin />
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<div className="editor-placeholder">Mesajınızı yazın...</div>}
        />
        <HistoryPlugin />
        <MarkdownShortcutPlugin />
        <OnEnterPlugin onSubmit={onSubmit} />
      </div>
    </LexicalComposer>
  );
};

// Toolbar
const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  
  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  };

  return (
    <div className="toolbar">
      <button onClick={formatBold} title="Bold (Ctrl+B)">
        <FormatBoldIcon />
      </button>
      <button onClick={formatItalic} title="Italic (Ctrl+I)">
        <FormatItalicIcon />
      </button>
      <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}>
        <CodeIcon />
      </button>
      {/* ... diğer formatting butonları */}
    </div>
  );
};

// Enter tuşu ile gönderme
const OnEnterPlugin = ({ onSubmit }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event.shiftKey) {
          event.preventDefault();
          const content = editor.getEditorState().toJSON();
          onSubmit(content);
          editor.clear();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onSubmit]);

  return null;
};

export default RichTextComposer;
```

MARKDOWN RENDERING:

```jsx
// frontend/src/components/chat/MessageContent.js
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageContent = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

BEKLENEN ÇIKTI:
- Zengin metin editörü
- Toolbar ile formatting
- Markdown shortcuts (**bold**, *italic*, `code`)
- Code block syntax highlighting
- Link otomatik algılama
- Enter ile gönder, Shift+Enter ile yeni satır
```

---

## 📌 TASK 6.4: GELİŞMİŞ EMOJI & GIF ENTEGRASYONU

### 🤖 Claude Prompt

```
GÖREV: Emoji picker ve GIF arama entegrasyonu

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Mevcut: Temel emoji desteği var
- Hedef: Gelişmiş emoji picker ve Giphy entegrasyonu

FRONTEND:

```jsx
// frontend/src/components/chat/EmojiGifPicker.js
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useState } from 'react';
import { Tab, Tabs } from '@mui/material';
import axios from 'axios';

const EmojiGifPicker = ({ onSelect }) => {
  const [tab, setTab] = useState(0);
  const [gifs, setGifs] = useState([]);
  const [gifSearch, setGifSearch] = useState('');

  const handleGifSearch = async (query) => {
    setGifSearch(query);
    if (!query) return;

    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: process.env.REACT_APP_GIPHY_API_KEY,
        q: query,
        limit: 20
      }
    });

    setGifs(response.data.data);
  };

  return (
    <div className="emoji-gif-picker">
      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab label="Emoji" />
        <Tab label="GIF" />
      </Tabs>

      {tab === 0 && (
        <Picker
          data={data}
          onEmojiSelect={(emoji) => onSelect({ type: 'emoji', data: emoji.native })}
          theme="light"
          previewPosition="none"
        />
      )}

      {tab === 1 && (
        <div className="gif-picker">
          <input
            type="text"
            placeholder="GIF ara..."
            value={gifSearch}
            onChange={(e) => handleGifSearch(e.target.value)}
            className="gif-search-input"
          />
          <div className="gif-grid">
            {gifs.map((gif) => (
              <img
                key={gif.id}
                src={gif.images.fixed_height_small.url}
                alt={gif.title}
                onClick={() => onSelect({ type: 'gif', data: gif.images.original.url })}
                className="gif-item cursor-pointer"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiGifPicker;
```

COMPOSER INTEGRATION:

```jsx
// frontend/src/components/chat/ChatComposer.js
const ChatComposer = () => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiGifSelect = ({ type, data }) => {
    if (type === 'emoji') {
      setMessage(message + data);
    } else if (type === 'gif') {
      sendMessage('', [{ type: 'gif', url: data }]);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div className="composer">
      <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
        <EmojiEmotionsIcon />
      </IconButton>

      {showEmojiPicker && (
        <Popover open={showEmojiPicker} onClose={() => setShowEmojiPicker(false)}>
          <EmojiGifPicker onSelect={handleEmojiGifSelect} />
        </Popover>
      )}

      <TextField value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button onClick={handleSend}>Gönder</Button>
    </div>
  );
};
```

BEKLENEN ÇIKTI:
- Emoji picker çalışıyor
- GIF arama ve gönderme
- Emoji + GIF tek picker'da (tab'lı)
- Recent emojis
```

---

## 📌 TASK 6.5: DARK MODE OPTİMİZASYONU

### 🤖 Claude Prompt

```
GÖREV: Dark mode'u optimize et ve tema switcher ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Mevcut: ThemeContext var ama sınırlı
- Hedef: Tam dark mode desteği, sistem teması algılama

FRONTEND:

```jsx
// frontend/src/contexts/ThemeContext.js güncellemesi
import { createContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

const lightTheme = {
  palette: {
    mode: 'light',
    primary: { main: '#1c61ab' },
    secondary: { main: '#8bb94a' },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    }
  }
};

const darkTheme = {
  palette: {
    mode: 'dark',
    primary: { main: '#4a9eff' },
    secondary: { main: '#9fcd5a' },
    background: {
      default: '#0f0f0f',
      paper: '#1e1e1e'
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#a0a0a0'
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // localStorage'dan oku veya sistem tercihini al
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  const theme = useMemo(
    () => createTheme(mode === 'dark' ? darkTheme : lightTheme),
    [mode]
  );

  const toggleTheme = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

THEME SWITCHER:

```jsx
// frontend/src/components/ThemeSwitcher.js
import { IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <IconButton onClick={toggleTheme} color="inherit">
      {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  );
};

export default ThemeSwitcher;
```

CSS VARIABLES:

```css
/* frontend/src/styles/variables.css */
:root {
  --primary-color: #1c61ab;
  --secondary-color: #8bb94a;
  --bg-default: #f5f5f5;
  --bg-paper: #ffffff;
  --text-primary: #000000;
  --text-secondary: #666666;
}

[data-theme='dark'] {
  --primary-color: #4a9eff;
  --secondary-color: #9fcd5a;
  --bg-default: #0f0f0f;
  --bg-paper: #1e1e1e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
}
```

BEKLENEN ÇIKTI:
- Dark mode tam destekli
- Theme switcher butonu (header'da)
- Sistem teması otomatik algılama
- localStorage'da tema tercihi saklanıyor
- Tüm componentler dark mode'da düzgün görünüyor
```

---

## ✅ PHASE 6 Tamamlanma Checklist

- [ ] TASK 6.1: PWA & offline modu
- [ ] TASK 6.2: Keyboard shortcuts
- [ ] TASK 6.3: Rich text editor
- [ ] TASK 6.4: Emoji & GIF entegrasyonu
- [ ] TASK 6.5: Dark mode optimizasyonu

---

## 🎉 TÜM PHASE'LER TAMAMLANDI!

**Artık Optima HR enterprise-level bir Slack/Bitrix alternatifi!**

### 📊 Toplam Özellikler:

- ✅ 6 Phase
- ✅ 25+ Major Task
- ✅ 100+ Feature
- ✅ Production-ready
- ✅ Scalable architecture

### 🚀 Son Adımlar:

1. Load testing (k6, Artillery)
2. Security audit
3. Documentation (API docs, user guide)
4. Deployment (Docker, Kubernetes)
5. Monitoring (Prometheus, Grafana)
6. CI/CD pipeline (GitHub Actions)

---
