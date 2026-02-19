/**
 * Slash Commands Service (Phase 5.2)
 * Chat'te / ile başlayan komutları işler
 * 
 * Kullanım:
 *   /status busy - Durumunu meşgul yap
 *   /task "Yeni görev" @kisi - Görev oluştur
 *   /remind 30m "Toplantı" - 30 dakika sonra hatırlat
 *   /poll "Soru?" "Seçenek1" "Seçenek2" - Anket oluştur
 *   /help - Komut listesi
 */

class SlashCommandService {
    constructor() {
        this.commands = new Map();
        this.registerDefaults();
    }

    /**
     * Komut kaydet
     * @param {string} name - Komut adı (/ olmadan)
     * @param {object} config - { description, usage, handler, permissions }
     */
    register(name, config) {
        this.commands.set(name.toLowerCase(), {
            name: name.toLowerCase(),
            description: config.description || '',
            usage: config.usage || `/${name}`,
            handler: config.handler,
            permissions: config.permissions || [],
            category: config.category || 'general'
        });
    }

    /**
     * Varsayılan komutları kaydet
     */
    registerDefaults() {
        // /help - Komut listesi
        this.register('help', {
            description: 'Kullanılabilir komutları listeler',
            usage: '/help',
            category: 'general',
            handler: async (args, context) => {
                const commands = Array.from(this.commands.values())
                    .map(cmd => `**/${cmd.name}** - ${cmd.description}`)
                    .join('\n');
                return {
                    type: 'ephemeral', // Sadece komutu çalıştıran kişi görür
                    message: `📋 **Kullanılabilir Komutlar:**\n${commands}`
                };
            }
        });

        // /status - Durum değiştir
        this.register('status', {
            description: 'Durumunuzu değiştirir',
            usage: '/status [online|busy|away|offline] [mesaj]',
            category: 'general',
            handler: async (args, context) => {
                const validStatuses = ['online', 'busy', 'away', 'offline', 'dnd'];
                const status = args[0]?.toLowerCase();
                const statusMessage = args.slice(1).join(' ');

                if (!status || !validStatuses.includes(status)) {
                    return {
                        type: 'ephemeral',
                        message: `Geçersiz durum. Kullanım: /status [${validStatuses.join('|')}] [mesaj]`
                    };
                }

                return {
                    type: 'action',
                    action: 'update_status',
                    data: { status, message: statusMessage },
                    message: `✅ Durumunuz **${status}** olarak güncellendi${statusMessage ? `: ${statusMessage}` : ''}`
                };
            }
        });

        // /task - Görev oluştur
        this.register('task', {
            description: 'Hızlı görev oluşturur',
            usage: '/task "Görev başlığı" [@kişi] [#öncelik]',
            category: 'productivity',
            handler: async (args, context) => {
                const title = args.join(' ').replace(/"/g, '');

                if (!title) {
                    return {
                        type: 'ephemeral',
                        message: 'Kullanım: /task "Görev başlığı"'
                    };
                }

                return {
                    type: 'action',
                    action: 'create_task',
                    data: {
                        title,
                        created_by: context.userId,
                        channel_id: context.channelId
                    },
                    message: `✅ Görev oluşturuldu: **${title}**`
                };
            }
        });

        // /remind - Hatırlatıcı
        this.register('remind', {
            description: 'Hatırlatıcı oluşturur',
            usage: '/remind [süre] "mesaj" (ör: /remind 30m "Toplantı")',
            category: 'productivity',
            handler: async (args, context) => {
                const timeStr = args[0];
                const reminderMessage = args.slice(1).join(' ').replace(/"/g, '');

                if (!timeStr || !reminderMessage) {
                    return {
                        type: 'ephemeral',
                        message: 'Kullanım: /remind 30m "Toplantı hazırlığı"'
                    };
                }

                // Süre parse: 30m, 1h, 2d
                let minutes = 0;
                const match = timeStr.match(/^(\d+)([mhd])$/);
                if (match) {
                    const value = parseInt(match[1]);
                    switch (match[2]) {
                        case 'm': minutes = value; break;
                        case 'h': minutes = value * 60; break;
                        case 'd': minutes = value * 1440; break;
                    }
                }

                if (minutes === 0) {
                    return { type: 'ephemeral', message: 'Geçersiz süre formatı. Örnek: 30m, 1h, 2d' };
                }

                const remindAt = new Date(Date.now() + minutes * 60000);

                return {
                    type: 'action',
                    action: 'create_reminder',
                    data: {
                        message: reminderMessage,
                        remind_at: remindAt.toISOString(),
                        user_id: context.userId
                    },
                    message: `⏰ Hatırlatıcı ayarlandı: **${reminderMessage}** (${remindAt.toLocaleTimeString('tr-TR')})`
                };
            }
        });

        // /poll - Anket oluştur
        this.register('poll', {
            description: 'Anket oluşturur',
            usage: '/poll "Soru?" "Seçenek1" "Seçenek2" ...',
            category: 'engagement',
            handler: async (args, context) => {
                const parts = args.join(' ').match(/"[^"]+"/g);
                if (!parts || parts.length < 3) {
                    return {
                        type: 'ephemeral',
                        message: 'Kullanım: /poll "Soru?" "Seçenek1" "Seçenek2"'
                    };
                }

                const question = parts[0].replace(/"/g, '');
                const options = parts.slice(1).map((p, i) => ({
                    id: i + 1,
                    text: p.replace(/"/g, ''),
                    votes: 0
                }));

                return {
                    type: 'rich_message',
                    message_type: 'poll',
                    data: { question, options },
                    message: `📊 **Anket:** ${question}\n${options.map((o, i) => `${i + 1}. ${o.text}`).join('\n')}`
                };
            }
        });

        // /clear - Mesajları temizle (admin)
        this.register('clear', {
            description: 'Son N mesajı temizler (Admin)',
            usage: '/clear [sayı]',
            category: 'admin',
            permissions: ['admin'],
            handler: async (args, context) => {
                const count = parseInt(args[0]) || 10;
                return {
                    type: 'action',
                    action: 'clear_messages',
                    data: { count, channel_id: context.channelId },
                    message: `🧹 Son ${count} mesaj temizlendi`
                };
            }
        });
    }

    /**
     * Slash komutu çalıştır
     * @param {string} input - Kullanıcı mesajı (/ ile başlayan)
     * @param {object} context - { userId, userName, channelId, roomId, siteCode }
     * @returns {object|null} Komut sonucu veya null (komut değilse)
     */
    async execute(input, context = {}) {
        if (!input || !input.startsWith('/')) return null;

        const parts = input.slice(1).split(/\s+/);
        const commandName = parts[0]?.toLowerCase();
        const args = parts.slice(1);

        const command = this.commands.get(commandName);
        if (!command) {
            return {
                type: 'ephemeral',
                message: `❌ Bilinmeyen komut: /${commandName}. /help yazarak komutları görebilirsiniz.`
            };
        }

        // Yetki kontrolü
        if (command.permissions.length > 0 && context.userRole) {
            const hasPermission = command.permissions.some(p =>
                context.userRole === 'SUPER_ADMIN' || context.userRole === p
            );
            if (!hasPermission) {
                return { type: 'ephemeral', message: '🚫 Bu komutu kullanma yetkiniz yok.' };
            }
        }

        try {
            return await command.handler(args, context);
        } catch (error) {
            console.error(`[SlashCommands] Error executing /${commandName}:`, error);
            return { type: 'ephemeral', message: `❌ Komut çalıştırılırken hata: ${error.message}` };
        }
    }

    /**
     * Tüm komutları listele
     */
    listCommands() {
        return Array.from(this.commands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            usage: cmd.usage,
            category: cmd.category
        }));
    }
}

module.exports = new SlashCommandService();
