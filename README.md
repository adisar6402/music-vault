# 🎧 Music Vault

Modern offline-first music player and PWA built with Expo, React Native, and Expo Router.

Music Vault lets users play, organize, and manage music seamlessly across mobile and web with a clean modern experience.

---

## ✨ Features

- 🎵 Offline music playback
- 📂 Playlist management
- ⚡ Fast lightweight performance
- 🌐 Progressive Web App (PWA)
- 📱 Android + iOS support
- 💻 Web support via Expo Router
- 🎧 Modern music player UI
- 🔥 Open Graph social sharing support

---

## 🚀 Tech Stack

- Expo
- React Native
- Expo Router
- TypeScript
- React Query
- Supabase
- PostgreSQL
- Drizzle ORM
- Express.js
- pnpm workspaces

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/music-vault.git
```

Install dependencies:

```bash
pnpm install
```

---

## ▶️ Run Development Server

### Mobile app

```bash
cd artifacts/mobile
npx expo start
```

### API server

```bash
pnpm --filter @workspace/api-server run dev
```

---

## 🌐 Build Web Version

```bash
npx expo export --platform web
```

---

## 📁 Project Structure

```txt
artifacts/
 ├── mobile/        # Expo React Native app
 ├── api-server/    # Backend API server
```

---

## 🔥 PWA Support

Music Vault includes:

- Web manifest
- Installable PWA
- Offline-ready assets
- Open Graph previews
- Twitter cards

---

## 📸 Social Preview

The project supports rich social sharing previews using:

- `og-image.png`
- Twitter Cards
- Open Graph metadata

---

## 🛠 Environment Variables

Create a `.env` file and configure:

```env
DATABASE_URL=your_database_url
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🚀 Deployment

Recommended platforms:

- Vercel
- Render
- Netlify

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Built by Abdulrahman Adisa Amuda