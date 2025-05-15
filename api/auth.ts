import type { VercelRequest, VercelResponse } from 'vercel';
import { serialize } from 'cookie';

const client_id = process.env.WHOOP_CLIENT_ID!;
const client_secret = process.env.WHOOP_CLIENT_SECRET!;
const redirect_uri = process.env.REDIRECT_URI!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id,
      client_secret,
      redirect_uri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();

  const userRes = await fetch('https://api.prod.whoop.com/developer/v1/user/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();

  const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      whoop_user_id: user.user_id,
      email: user.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: Date.now() + tokenData.expires_in * 1000,
    }),
  });

  res.setHeader('Set-Cookie', serialize('whoop_user_id', user.user_id, { path: '/', httpOnly: true }));
  res.redirect(302, '/success.html');
}
