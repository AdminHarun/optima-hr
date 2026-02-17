# 🚀 PHASE 5: ENTEGRASYONLAR & OTOMASYONLAR
## Bot, Webhook, Slash Komutları, Workflow (2-3 hafta)

---

## 📌 TASK 5.1: BOT/WEBHOOK SİSTEMİ

### 🤖 Claude Prompt

```
GÖREV: Bot ve webhook sistemi ekle (Slack benzeri)

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Incoming/outgoing webhooks ve bot API

DATABASE:

CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'incoming', 'outgoing'
  url TEXT NOT NULL,
  secret VARCHAR(255),
  channel_id INTEGER REFERENCES channels(id),
  events TEXT[], -- ['message.sent', 'task.created', 'user.joined']
  active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES employees_employee(employee_id),
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER REFERENCES webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100),
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  avatar_url TEXT,
  token VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES employees_employee(employee_id),
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

BACKEND - WEBHOOK SERVICE:

```javascript
// backend-express/services/WebhookService.js
const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
  async triggerWebhooks(event, data) {
    const webhooks = await Webhook.findAll({
      where: {
        active: true,
        events: { [Op.contains]: [event] }
      }
    });

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, event, data);
    }
  }

  async sendWebhook(webhook, event, data) {
    const startTime = Date.now();
    
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data
      };

      // HMAC signature
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event
        },
        timeout: 5000
      });

      // Log
      await WebhookLog.create({
        webhook_id: webhook.id,
        event,
        payload,
        response_status: response.status,
        response_body: JSON.stringify(response.data),
        duration_ms: Date.now() - startTime
      });

      return true;
    } catch (error) {
      await WebhookLog.create({
        webhook_id: webhook.id,
        event,
        payload: data,
        response_status: error.response?.status || 0,
        response_body: error.message,
        duration_ms: Date.now() - startTime
      });
      
      console.error('Webhook error:', error);
      return false;
    }
  }
}

module.exports = new WebhookService();
```

BACKEND ROUTES:

```javascript
// backend-express/routes/webhooks.js
router.post('/', authenticate, checkPermission('webhooks.create'), async (req, res) => {
  const { name, type, url, channelId, events } = req.body;
  
  const secret = crypto.randomBytes(32).toString('hex');
  
  const webhook = await Webhook.create({
    name,
    type,
    url,
    secret,
    channel_id: channelId,
    events,
    created_by: req.user.employeeId,
    site_code: req.user.siteCode
  });
  
  res.json({ webhook, secret });
});

// Incoming webhook endpoint
router.post('/incoming/:token', async (req, res) => {
  const { token } = req.params;
  
  const webhook = await Webhook.findOne({ where: { token, type: 'incoming' } });
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
  
  // Mesajı kanala gönder
  await ChatMessage.create({
    content: req.body.text,
    channel_id: webhook.channel_id,
    message_type: 'webhook',
    sender_id: null, // Bot mesajı
    metadata: { webhook_id: webhook.id }
  });
  
  res.json({ success: true });
});
```

EVENT TRIGGERS:

```javascript
// Mesaj gönderildiğinde
await webhookService.triggerWebhooks('message.sent', {
  messageId: message.id,
  channelId: message.channel_id,
  content: message.content,
  sender: message.sender
});

// Task oluşturulduğunda
await webhookService.triggerWebhooks('task.created', {
  taskId: task.id,
  title: task.title,
  assignedTo: task.assigned_to
});
```

BOT API:

```javascript
// backend-express/routes/bots.js
router.post('/message', authenticateBot, async (req, res) => {
  const { channelId, text, attachments } = req.body;
  const bot = req.bot;
  
  const message = await ChatMessage.create({
    content: text,
    channel_id: channelId,
    sender_id: null,
    message_type: 'bot',
    attachments,
    metadata: { bot_id: bot.id, bot_name: bot.name }
  });
  
  res.json(message);
});
```

FRONTEND:

```jsx
// frontend/src/pages/admin/WebhookManagement.js
const WebhookManagement = () => {
  // Webhook listesi
  // Webhook oluşturma formu
  // Webhook log görüntüleme
  // Test webhook butonu
};
```

BEKLENEN ÇIKTI:
- Webhook CRUD
- Outgoing webhook otomatik tetikleniyor
- Incoming webhook ile bot mesajları
- Webhook log'ları
- Bot API çalışıyor
```

---

## 📌 TASK 5.2: SLASH KOMUTLARI (/remind, /poll)

### 🤖 Claude Prompt

```
GÖREV: Slack tarzı slash komutları ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: /remind, /poll, /giphy, /status gibi komutlar

BACKEND:

```javascript
// backend-express/services/SlashCommandService.js
class SlashCommandService {
  constructor() {
    this.commands = {
      '/remind': this.handleRemind,
      '/poll': this.handlePoll,
      '/giphy': this.handleGiphy,
      '/status': this.handleStatus,
      '/shrug': () => '¯\\_(ツ)_/¯',
      '/tableflip': () => '(╯°□°）╯︵ ┻━┻'
    };
  }

  async execute(command, args, context) {
    const handler = this.commands[command];
    if (!handler) {
      return { error: `Unknown command: ${command}` };
    }
    
    return await handler.call(this, args, context);
  }

  async handleRemind(args, context) {
    // /remind @user "message" in 1h
    // /remind me "Take a break" at 3pm
    const match = args.match(/(@\w+|me)\s+"([^"]+)"\s+(in|at)\s+(.+)/);
    if (!match) {
      return { error: 'Usage: /remind @user "message" in 1h' };
    }

    const [, target, message, timeType, timeValue] = match;
    const userId = target === 'me' ? context.userId : this.parseUserId(target);
    
    const reminderTime = this.parseTime(timeType, timeValue);
    
    // Reminder oluştur
    const reminder = await Reminder.create({
      user_id: userId,
      message,
      scheduled_at: reminderTime,
      created_by: context.userId,
      channel_id: context.channelId
    });

    return {
      text: `✅ Reminder set for ${reminderTime.toLocaleString()}`,
      ephemeral: true // Sadece komutu çalıştıran görsün
    };
  }

  async handlePoll(args, context) {
    // /poll "Question?" "Option 1" "Option 2" "Option 3"
    const matches = args.match(/"([^"]+)"/g);
    if (!matches || matches.length < 3) {
      return { error: 'Usage: /poll "Question?" "Option 1" "Option 2"' };
    }

    const question = matches[0].replace(/"/g, '');
    const options = matches.slice(1).map(opt => opt.replace(/"/g, ''));

    const poll = await Poll.create({
      question,
      options: options.map((opt, idx) => ({ id: idx, text: opt, votes: 0 })),
      created_by: context.userId,
      channel_id: context.channelId
    });

    // Kanal mesajı olarak gönder
    await ChatMessage.create({
      content: `📊 **Poll:** ${question}`,
      channel_id: context.channelId,
      sender_id: context.userId,
      message_type: 'poll',
      metadata: { poll_id: poll.id }
    });

    return { success: true };
  }

  async handleGiphy(args, context) {
    // Giphy API entegrasyonu
    const query = args.trim();
    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: process.env.GIPHY_API_KEY,
        q: query,
        limit: 1
      }
    });

    const gif = response.data.data[0];
    if (!gif) {
      return { error: 'No GIF found' };
    }

    return {
      attachments: [{
        type: 'gif',
        url: gif.images.original.url,
        title: query
      }]
    };
  }

  async handleStatus(args, context) {
    // /status :emoji: Status message
    const match = args.match(/:(\w+):\s*(.+)/);
    if (!match) {
      return { error: 'Usage: /status :emoji: Your status message' };
    }

    const [, emoji, statusText] = match;

    await Employee.update(
      { status_emoji: emoji, status_message: statusText },
      { where: { employee_id: context.userId } }
    );

    return {
      text: `Status updated: :${emoji}: ${statusText}`,
      ephemeral: true
    };
  }
}

module.exports = new SlashCommandService();
```

BACKEND ROUTE:

```javascript
// backend-express/routes/commands.js
router.post('/execute', authenticate, async (req, res) => {
  const { command, args, channelId, roomId } = req.body;
  
  const context = {
    userId: req.user.employeeId,
    channelId,
    roomId,
    siteCode: req.user.siteCode
  };

  const result = await slashCommandService.execute(command, args, context);
  
  if (result.error) {
    return res.status(400).json(result);
  }

  res.json(result);
});
```

FRONTEND:

```jsx
// frontend/src/components/chat/ChatComposer.js
const ChatComposer = () => {
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (input.startsWith('/')) {
      // Slash command
      const [command, ...args] = input.split(' ');
      const result = await axios.post('/api/commands/execute', {
        command,
        args: args.join(' '),
        channelId: currentChannelId
      });

      if (result.data.text) {
        // Ephemeral mesaj göster
        showEphemeralMessage(result.data.text);
      }
    } else {
      // Normal mesaj gönder
      sendMessage(input);
    }

    setInput('');
  };

  // Autocomplete için /  yazınca komut listesi göster
  const [showCommands, setShowCommands] = useState(false);

  return (
    <div>
      <TextField
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowCommands(e.target.value.startsWith('/'));
        }}
      />
      
      {showCommands && (
        <CommandAutocomplete commands={['/remind', '/poll', '/giphy', '/status']} />
      )}
    </div>
  );
};
```

CRON JOB - REMINDER:

```javascript
// backend-express/jobs/reminderJob.js
cron.schedule('* * * * *', async () => {
  // Her dakika kontrol et
  const now = new Date();
  
  const reminders = await Reminder.findAll({
    where: {
      scheduled_at: { [Op.lte]: now },
      sent: false
    }
  });

  for (const reminder of reminders) {
    // Notification gönder
    await notificationService.send(reminder.user_id, {
      type: 'reminder',
      title: 'Reminder',
      message: reminder.message,
      link: `/chat/${reminder.channel_id}`
    });

    await reminder.update({ sent: true });
  }
});
```

BEKLENEN ÇIKTI:
- Slash komutları çalışıyor
- /remind ile hatırlatıcı
- /poll ile anket
- /giphy ile GIF arama
- /status ile durum güncelleme
- Komut autocomplete
```

---

## 📌 TASK 5.3: ÜÇÜNCÜ PARTİ ENTEGRASYONLAR

### 🤖 Claude Prompt

```
GÖREV: Google Drive, GitHub, Trello entegrasyonları

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Popüler servislerle entegrasyon

DATABASE:

CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- 'google_drive', 'github', 'trello'
  user_id INTEGER REFERENCES employees_employee(employee_id),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  metadata JSONB,
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

GOOGLE DRIVE:

```javascript
// backend-express/services/integrations/GoogleDriveService.js
const { google } = require('googleapis');

class GoogleDriveService {
  async authorize(userId) {
    const integration = await Integration.findOne({
      where: { user_id: userId, name: 'google_drive' }
    });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  async listFiles(userId, folderId = 'root') {
    const drive = await this.authorize(userId);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, mimeType, modifiedTime, size)'
    });

    return response.data.files;
  }

  async uploadFile(userId, file, folderId = 'root') {
    const drive = await this.authorize(userId);

    const response = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [folderId]
      },
      media: {
        mimeType: file.mimetype,
        body: file.buffer
      }
    });

    return response.data;
  }

  async shareFileToChannel(userId, fileId, channelId) {
    const drive = await this.authorize(userId);

    // Public link oluştur
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const file = await drive.files.get({ fileId, fields: 'webViewLink, name' });

    // Chat mesajı olarak paylaş
    await ChatMessage.create({
      content: `📎 ${file.data.name}\n${file.data.webViewLink}`,
      channel_id: channelId,
      sender_id: userId,
      message_type: 'integration',
      metadata: { integration: 'google_drive', file_id: fileId }
    });
  }
}
```

GITHUB:

```javascript
// backend-express/services/integrations/GitHubService.js
const { Octokit } = require('@octokit/rest');

class GitHubService {
  async getClient(userId) {
    const integration = await Integration.findOne({
      where: { user_id: userId, name: 'github' }
    });

    return new Octokit({ auth: integration.access_token });
  }

  async getIssues(userId, owner, repo) {
    const octokit = await this.getClient(userId);
    const { data } = await octokit.issues.listForRepo({ owner, repo });
    return data;
  }

  async postIssueToChannel(userId, owner, repo, issueNumber, channelId) {
    const octokit = await this.getClient(userId);
    const { data: issue } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });

    await ChatMessage.create({
      content: `🐛 **GitHub Issue #${issueNumber}**\n${issue.title}\n${issue.html_url}`,
      channel_id: channelId,
      sender_id: userId,
      message_type: 'integration',
      metadata: { integration: 'github', issue_id: issueNumber }
    });
  }

  // Webhook handler
  async handleWebhook(payload) {
    // GitHub webhook event'lerini dinle
    if (payload.action === 'opened' && payload.issue) {
      // Yeni issue açıldığında kanal bildirimi
      // ...
    }
  }
}
```

FRONTEND:

```jsx
// frontend/src/pages/Settings/Integrations.js
const Integrations = () => {
  const integrations = [
    { name: 'Google Drive', icon: <GoogleIcon />, connected: false },
    { name: 'GitHub', icon: <GitHubIcon />, connected: false },
    { name: 'Trello', icon: <TrelloIcon />, connected: false }
  ];

  const handleConnect = async (name) => {
    // OAuth flow başlat
    window.location.href = `/api/integrations/${name}/authorize`;
  };

  return (
    <List>
      {integrations.map(int => (
        <ListItem key={int.name}>
          <ListItemIcon>{int.icon}</ListItemIcon>
          <ListItemText primary={int.name} />
          <Button onClick={() => handleConnect(int.name)}>
            {int.connected ? 'Disconnect' : 'Connect'}
          </Button>
        </ListItem>
      ))}
    </List>
  );
};
```

BEKLENEN ÇIKTI:
- OAuth entegrasyonları çalışıyor
- Google Drive dosya paylaşımı
- GitHub issue tracking
- Entegrasyon ayarları sayfası
```

---

## 📌 TASK 5.4: WORKFLOW OTOMASYON MOTORU

### 🤖 Claude Prompt

```
GÖREV: Zapier/IFTTT tarzı workflow otomasyon sistemi

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: "When X happens, do Y" kuralları

DATABASE:

CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL, -- 'message.sent', 'task.created', 'user.joined'
  trigger_conditions JSONB, -- {channel_id: 123, keyword: 'urgent'}
  actions JSONB[], -- [{ type: 'send_notification', params: {...} }]
  active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES employees_employee(employee_id),
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_executions (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_data JSONB,
  actions_executed JSONB,
  success BOOLEAN,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

BACKEND - WORKFLOW ENGINE:

```javascript
// backend-express/services/WorkflowEngine.js
class WorkflowEngine {
  async trigger(eventType, data) {
    const workflows = await Workflow.findAll({
      where: { trigger_type: eventType, active: true }
    });

    for (const workflow of workflows) {
      if (this.matchesConditions(workflow.trigger_conditions, data)) {
        await this.execute(workflow, data);
      }
    }
  }

  matchesConditions(conditions, data) {
    if (!conditions) return true;

    for (const [key, value] of Object.entries(conditions)) {
      if (data[key] !== value) return false;
    }

    return true;
  }

  async execute(workflow, triggerData) {
    const executedActions = [];
    let success = true;
    let errorMessage = null;

    try {
      for (const action of workflow.actions) {
        const result = await this.executeAction(action, triggerData);
        executedActions.push({ action: action.type, result });
      }
    } catch (error) {
      success = false;
      errorMessage = error.message;
    }

    await WorkflowExecution.create({
      workflow_id: workflow.id,
      trigger_data: triggerData,
      actions_executed: executedActions,
      success,
      error_message: errorMessage
    });
  }

  async executeAction(action, data) {
    switch (action.type) {
      case 'send_notification':
        return await this.actionSendNotification(action.params, data);
      
      case 'create_task':
        return await this.actionCreateTask(action.params, data);
      
      case 'send_email':
        return await this.actionSendEmail(action.params, data);
      
      case 'webhook':
        return await this.actionWebhook(action.params, data);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async actionSendNotification(params, data) {
    await notificationService.send(params.userId, {
      title: this.interpolate(params.title, data),
      message: this.interpolate(params.message, data)
    });
  }

  async actionCreateTask(params, data) {
    await Task.create({
      title: this.interpolate(params.title, data),
      description: this.interpolate(params.description, data),
      assigned_to: params.assignedTo,
      priority: params.priority
    });
  }

  interpolate(template, data) {
    // {{channel_name}} gibi placeholder'ları replace et
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }
}

module.exports = new WorkflowEngine();
```

ÖRNEK WORKFLOW:

```javascript
// "urgent" kelimesi içeren mesajlarda manager'a bildirim gönder
{
  name: "Urgent Message Alert",
  trigger_type: "message.sent",
  trigger_conditions: {
    keyword: "urgent"
  },
  actions: [
    {
      type: "send_notification",
      params: {
        userId: 5, // Manager ID
        title: "Urgent Message",
        message: "{{sender_name}} sent an urgent message in {{channel_name}}"
      }
    },
    {
      type: "create_task",
      params: {
        title: "Review urgent message",
        assignedTo: 5,
        priority: "high"
      }
    }
  ]
}
```

FRONTEND - WORKFLOW BUILDER:

```jsx
// frontend/src/pages/admin/WorkflowBuilder.js
const WorkflowBuilder = () => {
  const [workflow, setWorkflow] = useState({
    name: '',
    trigger: { type: '', conditions: {} },
    actions: []
  });

  return (
    <div className="workflow-builder">
      <h2>Workflow Oluştur</h2>
      
      {/* Trigger seçimi */}
      <Select value={workflow.trigger.type} onChange={...}>
        <MenuItem value="message.sent">Mesaj gönderildiğinde</MenuItem>
        <MenuItem value="task.created">Görev oluşturulduğunda</MenuItem>
        <MenuItem value="user.joined">Kullanıcı katıldığında</MenuItem>
      </Select>

      {/* Conditions */}
      <ConditionBuilder conditions={workflow.trigger.conditions} />

      {/* Actions */}
      <ActionsList actions={workflow.actions} onAdd={...} onRemove={...} />

      <Button onClick={handleSave}>Kaydet</Button>
    </div>
  );
};
```

BEKLENEN ÇIKTI:
- Workflow engine çalışıyor
- Trigger'lar otomatik tetikleniyor
- Action'lar çalıştırılıyor
- Workflow builder UI
- Execution log'ları
```

---

## ✅ PHASE 5 Tamamlanma Checklist

- [ ] TASK 5.1: Bot/webhook sistemi
- [ ] TASK 5.2: Slash komutları
- [ ] TASK 5.3: Üçüncü parti entegrasyonlar
- [ ] TASK 5.4: Workflow otomasyon

**PHASE 5 tamamlandıktan sonra PHASE 6'ya geç!**

---
