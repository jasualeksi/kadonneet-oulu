# Supabase-tunnistautumisen käyttöönotto

## 1. Luo projekti

1. Luo projekti osoitteessa https://supabase.com/dashboard.
2. Avaa projektissa **Project Settings → API**.
3. Kopioi **Project URL** ja **Publishable key** (tai vanhempi `anon`-avain).
4. Älä koskaan käytä selaimessa `service_role`-avainta.

## 2. Paikallinen kehitys

Kopioi `.env.example` nimelle `.env.local` ja täytä arvot:

```env
VITE_SUPABASE_URL=https://PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY
```

Käynnistä sen jälkeen kehityspalvelin uudelleen komennolla `npm run dev`.

## 3. Cloudflare

Lisää Cloudflare-projektin **Settings → Variables and Secrets** -kohtaan:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nämä ovat Supabasen selainkäyttöön tarkoitetut julkiset arvot. Käynnistä deployment uudelleen niiden lisäämisen jälkeen.

## 4. Sähköpostivahvistus

1. Supabase: **Authentication → Sign In / Providers → Email**.
2. Pidä **Confirm email** käytössä.
3. Supabase: **Authentication → URL Configuration**.
4. Aseta **Site URL** arvoksi `https://kadonneet-oulu.fi`.
5. Lisää Redirect URLs -listaan:
   - `https://kadonneet-oulu.fi/**`
   - `http://localhost:5173/**`

Supabasen oma testipostipalvelin ei sovellu julkiseen tuotantokäyttöön. Lisää ennen julkaisua **Project Settings → Authentication → SMTP Settings** -kohtaan oman sähköpostipalvelun SMTP-tiedot. Ilman omaa SMTP:tä vahvistusviestejä voidaan lähettää vain Supabase-organisaation hyväksytyille osoitteille.
