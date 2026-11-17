// Un admin aprueba o rechaza a un profesional. Al aprobar, Supabase le manda un mail de invitación.
// Variables de entorno (Vercel): SUPABASE_SECRET_KEY
const SB = 'https://znzbwtewxpcpqtmjbmdw.supabase.co';
const PUB = 'sb_publishable_DRouvIiAf-Vj354iZnNx5Q_XoOt3akE';
const SITE = 'https://www.formaconceptba.com';
const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const KEY = process.env.SUPABASE_SECRET_KEY;
  if (!KEY) return res.status(503).json({ error: 'Falta configurar SUPABASE_SECRET_KEY en Vercel.' });
  try {
    // 1) Quien llama tiene que ser admin (se verifica con su propia sesión).
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Sin sesión' });
    const chk = await fetch(SB + '/rest/v1/rpc/is_admin', { method: 'POST', headers: { apikey: PUB, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
    if (!chk.ok || (await chk.json()) !== true) return res.status(403).json({ error: 'No autorizado' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const id = parseInt(body.id), estado = String(body.estado || '');
    if (!id || !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Datos inválidos' });

    const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
    // 2) Cambiar el estado.
    const up = await fetch(`${SB}/rest/v1/profesionales?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ estado }) });
    const [pro] = await up.json();
    if (!pro) return res.status(404).json({ error: 'Profesional no encontrado' });

    // 3) Si se aprobó, invitarlo (crea su acceso y le manda el mail).
    let invitado = false, yaTenia = false;
    if (estado === 'aprobado') {
      const inv = await fetch(`${SB}/auth/v1/invite?redirect_to=${encodeURIComponent(SITE + '/?pro=1')}`, { method: 'POST', headers: H, body: JSON.stringify({ email: pro.email }) });
      if (inv.ok) invitado = true;
      else {
        const t = await inv.text();
        if (/already|registered|exists/i.test(t)) yaTenia = true;
        else { console.error('invite', t); return res.status(200).json({ ok: true, aviso: 'Aprobado, pero no se pudo mandar el mail de invitación. Probá de nuevo en una hora.' }); }
      }
    }
    return res.status(200).json({ ok: true, invitado, yaTenia });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error inesperado' });
  }
}
