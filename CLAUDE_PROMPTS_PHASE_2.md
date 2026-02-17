# 🚀 PHASE 2: İŞ AKIŞI ENTEGRASYONU
## Görev Yönetimi, Takvim, Dosya Sistemi (3-4 hafta)

---

## 📌 TASK 2.1: GÖREV YÖNETİM SİSTEMİ (TASK MANAGEMENT)

### 🤖 Claude Prompt

```
GÖREV: Bitrix tarzı görev yönetim sistemi ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Task oluşturma, atama, durum takibi, öncelik

DATABASE SCHEMA:

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  created_by INTEGER REFERENCES employees_employee(employee_id),
  assigned_to INTEGER REFERENCES employees_employee(employee_id),
  project_id INTEGER REFERENCES projects(id),
  channel_id INTEGER REFERENCES channels(id),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees_employee(employee_id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_url TEXT,
  file_size BIGINT,
  uploaded_by INTEGER REFERENCES employees_employee(employee_id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_watchers (
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees_employee(employee_id),
  PRIMARY KEY (task_id, employee_id)
);

BACKEND ROUTES:

POST   /api/tasks              - Görev oluştur
GET    /api/tasks              - Görevleri listele (filtreleme: status, assigned_to, project_id)
GET    /api/tasks/:id          - Görev detayı
PUT    /api/tasks/:id          - Görev güncelle
DELETE /api/tasks/:id          - Görev sil
POST   /api/tasks/:id/comments - Yorum ekle
GET    /api/tasks/:id/comments - Yorumları getir
POST   /api/tasks/:id/watch    - Görevi takip et
DELETE /api/tasks/:id/watch    - Takibi bırak

FRONTEND COMPONENTS:

1. TaskList.js - Görev listesi (filtreleme, arama)
2. TaskCard.js - Görev kartı (özet bilgi)
3. TaskDetail.js - Görev detay modal
4. TaskForm.js - Görev oluşturma/düzenleme formu
5. TaskComments.js - Yorum listesi ve ekleme

ÖZELLIKLER:
- Görev oluşturma/düzenleme/silme
- Durum değiştirme (drag-drop ile Kanban'da)
- Öncelik renklendirmesi (kırmızı: urgent, turuncu: high)
- Atama ve bildirim
- Yorumlar
- Dosya ekleme
- Görev takip (watch)
- Tarihe göre filtreleme

BEKLENEN ÇIKTI:
- Çalışan görev yönetim sistemi
- CRUD operations
- Real-time güncellemeler (WebSocket)
- Bildirimler
```

---

## 📌 TASK 2.2: KANBAN PANOSU

### 🤖 Claude Prompt

```
GÖREV: Drag-and-drop Kanban panosu ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Task'ları sürükle-bırak ile durum değiştirme

FRONTEND:

Kütüphane: @dnd-kit/core veya react-beautiful-dnd

```jsx
// frontend/src/pages/KanbanBoard.js
import { DndContext, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const columns = [
  { id: 'todo', title: 'Yapılacak', color: 'gray' },
  { id: 'in_progress', title: 'Devam Ediyor', color: 'blue' },
  { id: 'review', title: 'İnceleme', color: 'yellow' },
  { id: 'done', title: 'Tamamlandı', color: 'green' }
];

const KanbanBoard = () => {
  const [tasks, setTasks] = useState({});

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;

    // Backend'e güncelleme gönder
    await axios.put(`/api/tasks/${taskId}`, { status: newStatus });

    // Local state güncelle
    // ...
  };

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="kanban-board flex gap-4 p-4">
        {columns.map(column => (
          <div key={column.id} className="kanban-column flex-1">
            <h3>{column.title}</h3>
            <SortableContext items={tasks[column.id] || []} strategy={verticalListSortingStrategy}>
              {tasks[column.id]?.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
};
```

ÖZELLIKLER:
- Drag-and-drop
- Durum değişince backend güncellenir
- Kolon başına task sayısı
- Responsive (mobilde swipe)

BEKLENEN ÇIKTI:
- Çalışan Kanban panosu
- Task kartları sürüklenebilir
- Durum değişimi kaydedilir
```

---

## 📌 TASK 2.3: TAKVİM ENTEGRASYONU

### 🤖 Claude Prompt

```
GÖREV: Takvi sistemi ekle - meeting scheduling, task deadlines

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Ekip takvimleri, toplantı planlama

DATABASE:

CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) DEFAULT 'meeting', -- 'meeting', 'task_deadline', 'holiday', 'other'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location VARCHAR(255),
  video_call_url TEXT,
  created_by INTEGER REFERENCES employees_employee(employee_id),
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_participants (
  event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees_employee(employee_id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative'
  PRIMARY KEY (event_id, employee_id)
);

BACKEND ROUTES:

POST   /api/calendar/events            - Etkinlik oluştur
GET    /api/calendar/events            - Etkinlikleri listele (date range)
GET    /api/calendar/events/:id        - Etkinlik detayı
PUT    /api/calendar/events/:id        - Etkinlik güncelle
DELETE /api/calendar/events/:id        - Etkinlik sil
POST   /api/calendar/events/:id/respond - Davete yanıt ver (accept/decline)

FRONTEND:

Kütüphane: @mui/x-date-pickers veya react-big-calendar

```jsx
// frontend/src/pages/Calendar.js
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
  const [events, setEvents] = useState([]);

  const handleSelectSlot = ({ start, end }) => {
    // Yeni etkinlik modal'ı aç
  };

  const handleSelectEvent = (event) => {
    // Etkinlik detayı modal'ı aç
  };

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      onSelectSlot={handleSelectSlot}
      onSelectEvent={handleSelectEvent}
      selectable
    />
  );
};
```

ÖZELLIKLER:
- Toplantı oluşturma
- Katılımcı ekleme
- Davet gönderme (email/notification)
- Yanıt verme (accept/decline)
- Task deadline'ları takvimde gösterme
- Günlük/haftalık/aylık görünüm

BEKLENEN ÇIKTI:
- Çalışan takvim sistemi
- Toplantı planlama
- Bildirimler
```

---

## 📌 TASK 2.4: DOSYA YÖNETİMİ & CLOUDFLARE R2

### 🤖 Claude Prompt

```
GÖREV: Dosya yönetim sistemi + Cloudflare R2 entegrasyonu

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Mevcut: Yerel dosya depolama
- Hedef: Cloudflare R2 (S3-compatible), klasör yapısı, arama

ÖNCE: r2-migration-plan.md dosyasını incele
Dosya: /Users/furkandaghan/Documents/verdent-projects/optima/r2-migration-plan.md

CLOUDFLARE R2 SETUP:

1. Environment variables (.env):
```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=optima-hr-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

2. Backend - R2 Service:
```javascript
// backend-express/services/R2StorageService.js
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class R2StorageService {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
  }

  async uploadFile(file, path) {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path,
      Body: file.buffer,
      ContentType: file.mimetype
    });
    
    await this.client.send(command);
    return `${process.env.R2_PUBLIC_URL}/${path}`;
  }

  async getSignedUrl(path, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path
    });
    
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(path) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path
    });
    
    await this.client.send(command);
  }
}
```

3. Backend Routes - File Management:
```javascript
// backend-express/routes/files.js
POST   /api/files/upload     - Dosya yükle (multipart/form-data)
GET    /api/files            - Dosyaları listele (folder, search)
GET    /api/files/:id        - Dosya detayı + signed URL
DELETE /api/files/:id        - Dosya sil
POST   /api/files/folder     - Klasör oluştur
```

4. Database:
```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL, -- R2'deki path
  folder_id INTEGER REFERENCES folders(id),
  size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES employees_employee(employee_id),
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  site_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

FRONTEND:

- Drag-and-drop file upload
- Folder tree view
- File preview (images, PDFs)
- Download link generation

BEKLENEN ÇIKTI:
- R2 entegrasyonu çalışıyor
- Dosya yükleme/indirme/silme
- Klasör yapısı
- Signed URL ile güvenli erişim
```

---

## 📌 TASK 2.5: DOSYA VERSİYONLAMA

### 🤖 Claude Prompt

```
GÖREV: Dosya versiyonlama sistemi ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Dosya güncellenince eski versiyonlar saklanır

DATABASE:

CREATE TABLE file_versions (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  path TEXT NOT NULL,
  size BIGINT,
  uploaded_by INTEGER REFERENCES employees_employee(employee_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

BACKEND LOGIC:

- Dosya güncellenince: Mevcut dosyayı file_versions'a taşı
- Version number otomatik artır
- R2'de path: files/{file_id}/v{version_number}/{filename}

FRONTEND:

- Dosya detay modal'ında "Versiyon Geçmişi" tab'ı
- Eski versiyonları görüntüleme
- Eski versiyona geri dönme

BEKLENEN ÇIKTI:
- Dosya versiyonlama çalışıyor
- Eski versiyonlar saklanıyor
- Versiyon geçmişi görülebiliyor
```

---

## ✅ PHASE 2 Tamamlanma Checklist

- [ ] TASK 2.1: Görev yönetim sistemi
- [ ] TASK 2.2: Kanban panosu
- [ ] TASK 2.3: Takvim entegrasyonu
- [ ] TASK 2.4: Cloudflare R2 + Dosya yönetimi
- [ ] TASK 2.5: Dosya versiyonlama

**PHASE 2 tamamlandıktan sonra PHASE 3'e geç!**

---
