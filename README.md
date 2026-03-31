# SocialSnap - Advanced Social Media App

A modern, feature-rich social media application built with React and Firebase Realtime Database.

## Features

### Core
- **Authentication**: Email/Password and Google Sign-in.
- **Feed**: Real-time posts with infinite scroll (or optimized listening).
- **Profiles**: customizable profiles with photos, bio, cover images.
- **Engagement**: Likes, Comments, Saved Posts.

### Advanced
- **Real-time Chat**: 1-to-1 messaging with online presence and read receipts.
- **Stories**: 24-hour disappearing photo stories with auto-advance viewer.
- **Follow System**: Follow/Unfollow with real-time counters and notifications.
- **Notifications**: Real-time alerts for likes, comments, and follows.
- **Search**: Debounced searching for users.
- **Dark Mode**: Persisted theme preference.
- **Analytics**: Personal dashboard tracking profile views and post engagement.
- **Security**: Robust Firebase Security Rules.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Firebase Configuration**:
   Ensure `src/firebase.js` is configured with your project keys.

3. **Security Rules**:
   Copy the contents of `database.rules.json` to your Firebase Console -> Realtime Database -> Rules.

4. **Run Locally**:
   ```bash
   npm run dev
   ```

## Technologies
- React (Vite)
- Firebase Realtime Database
- CSS Modules / Vanilla CSS (Premium Styling)

## License
MIT
