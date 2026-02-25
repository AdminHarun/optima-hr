/**
 * Cloudflare Turnstile Middleware
 * Bot koruması - login ve başvuru formları için
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const verifyTurnstile = async (req, res, next) => {
  // Development'ta Turnstile'ı atla
  if (!TURNSTILE_SECRET) {
    console.warn('⚠️  TURNSTILE_SECRET_KEY tanımlı değil — Turnstile doğrulama atlanıyor');
    return next();
  }

  const turnstileToken = req.body.turnstileToken || req.body['cf-turnstile-response'];

  if (!turnstileToken) {
    return res.status(403).json({
      success: false,
      error: 'Bot doğrulama gerekli — lütfen "Gerçek kişi olduğunuzu doğrulayın" kutucuğunu tamamlayın'
    });
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: turnstileToken,
        remoteip: req.ip
      })
    });

    const data = await response.json();

    if (!data.success) {
      console.warn('[Turnstile] Doğrulama başarısız:', data['error-codes']);
      return res.status(403).json({
        success: false,
        error: 'Bot doğrulama başarısız — lütfen tekrar deneyin'
      });
    }

    next();
  } catch (error) {
    console.error('[Turnstile] API hatası:', error.message);
    // Turnstile API çökerse kullanıcıyı engelleme
    next();
  }
};

module.exports = { verifyTurnstile };
