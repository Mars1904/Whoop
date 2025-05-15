import type { VercelRequest, VercelResponse } from 'vercel';

export default async function handler(_: VercelRequest, res: VercelResponse) {
  const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
  });
  const users = await supabaseRes.json();

  for (const user of users) {
    const response = await fetch('https://api.prod.whoop.com/developer/v1/cycle', {
      headers: { Authorization: `Bearer ${user.access_token}` },
    });
    const cycle = await response.json();

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/data_cycles`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        cycle_id: cycle.id,
        strain: cycle.strain,
        avg_heart_rate: cycle.average_heart_rate,
        cycle_date: cycle.created_at.split('T')[0],
      }),
    });
  }

  res.status(200).send('Data sync complete');
}
