# CladeAI Android App Repository Setup

## Overview

This guide covers setting up a separate repository for the CladeAI Android mobile app using React Native with TypeScript.

## Repository Structure

```
cladeai-android/
├── android/                    # Native Android code
│   ├── app/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/
│   │   │   │   ├── res/
│   │   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── gradle/
│   └── build.gradle
├── ios/                        # iOS code (for cross-platform)
├── src/                        # React Native TypeScript code
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── api/
│   ├── hooks/
│   ├── services/
│   ├── store/                  # Redux/Zustand state management
│   ├── types/
│   ├── utils/
│   └── App.tsx
├── __tests__/                  # Jest tests
├── .github/
│   └── workflows/
│       ├── android-build.yml
│       ├── android-test.yml
│       └── android-release.yml
├── app.json
├── babel.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Initial Setup Commands

### 1. Create New Repository

```bash
# Create new directory
mkdir cladeai-android
cd cladeai-android

# Initialize React Native project
npx react-native@latest init CladeAI --template react-native-template-typescript

# Initialize git
git init
git remote add origin https://github.com/yourusername/cladeai-android.git
```

### 2. Install Essential Dependencies

```bash
# Navigation
bun install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
bun install react-native-screens react-native-safe-area-context
bun install react-native-gesture-handler react-native-reanimated

# State Management
bun install zustand

# API & Data
bun install @supabase/supabase-js
bun install axios
bun install @tanstack/react-query

# UI Components
bun install react-native-paper
bun install react-native-vector-icons
bun install react-native-svg

# Audio Player
bun install react-native-track-player
bun install react-native-spotify-remote

# Billing
bun install react-native-iap
bun install react-native-purchases  # RevenueCat

# Utilities
bun install date-fns
bun install react-native-dotenv
bun install react-native-config

# Dev Dependencies
bun install --save-dev @types/react-native
bun install --save-dev @testing-library/react-native
bun install --save-dev jest
bun install --save-dev prettier eslint
```

### 3. Configure Android Build

**android/app/build.gradle:**

```gradle
android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"
    
    defaultConfig {
        applicationId "com.cladeai.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        
        buildConfigField "String", "SUPABASE_URL", "\"${System.getenv('SUPABASE_URL')}\""
        buildConfigField "String", "SUPABASE_ANON_KEY", "\"${System.getenv('SUPABASE_ANON_KEY')}\""
    }
    
    signingConfigs {
        release {
            if (System.getenv('KEYSTORE_FILE')) {
                storeFile file(System.getenv('KEYSTORE_FILE'))
                storePassword System.getenv('KEYSTORE_PASSWORD')
                keyAlias System.getenv('KEY_ALIAS')
                keyPassword System.getenv('KEY_PASSWORD')
            }
        }
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

## App Structure

### Main App Component

**src/App.tsx:**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

import FeedScreen from './screens/FeedScreen';
import SearchScreen from './screens/SearchScreen';
import PlayerScreen from './screens/PlayerScreen';
import ProfileScreen from './screens/ProfileScreen';
import { useAuthStore } from './store/authStore';

const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

// Register playback service
TrackPlayer.registerPlaybackService(() => require('./services/playbackService'));

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider>
          <NavigationContainer>
            <Tab.Navigator>
              <Tab.Screen name="Feed" component={FeedScreen} />
              <Tab.Screen name="Search" component={SearchScreen} />
              <Tab.Screen name="Player" component={PlayerScreen} />
              <Tab.Screen name="Profile" component={ProfileScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

### Supabase Client

**src/services/supabase.ts:**

```typescript
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

export const supabase = createClient(
  Config.SUPABASE_URL!,
  Config.SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Premium Billing Integration

**src/services/billing.ts:**

```typescript
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import Config from 'react-native-config';

export const initializeBilling = async () => {
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  
  if (Platform.OS === 'android') {
    await Purchases.configure({ apiKey: Config.REVENUECAT_ANDROID_KEY! });
  } else {
    await Purchases.configure({ apiKey: Config.REVENUECAT_IOS_KEY! });
  }
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

export const purchasePremium = async (packageId: string) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageId);
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (error) {
    console.error('Purchase error:', error);
    return false;
  }
};

export const checkPremiumStatus = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (error) {
    return false;
  }
};
```

### Audio Playback Service

**src/services/playbackService.ts:**

```typescript
import TrackPlayer, { Event, Track } from 'react-native-track-player';

export const playbackService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
};

export const setupPlayer = async () => {
  await TrackPlayer.setupPlayer({});
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
  });
};

export const addTrack = async (track: Track) => {
  await TrackPlayer.add(track);
};

export const playTrack = async (trackId: string) => {
  await TrackPlayer.play();
};
```

## GitHub Actions CI/CD

### Android Build Workflow

**.github/workflows/android-build.yml:**

```yaml
name: Android Build

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'bun'
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Install dependencies
        run: bun ci
      
      - name: Run tests
        run: bun test
      
      - name: Build Android APK
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          cd android
          ./gradlew assembleRelease
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

### Android Release Workflow

**.github/workflows/android-release.yml:**

```yaml
name: Android Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Install dependencies
        run: bun ci
      
      - name: Decode Keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo $KEYSTORE_BASE64 | base64 -d > android/app/release.keystore
      
      - name: Build AAB
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          KEYSTORE_FILE: release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew bundleRelease
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.cladeai.app
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: production
          status: completed
```

## Play Store Listing

### App Details

- **Title**: CladeAI - Music Discovery & Social
- **Short Description**: Discover music with AI, connect with listeners, share your taste
- **Full Description**:

```
CladeAI transforms music discovery into a social experience powered by AI.

🎵 FEATURES:
• AI-Powered Music Discovery - Find new tracks based on your taste
• Real-time Social Feed - See what the community is listening to
• Harmony Analysis - Explore chord progressions and music theory
• Multi-Platform Support - Connect Spotify, YouTube, and more
• Live Comments & Reactions - Engage with fellow music lovers
• Personalized Recommendations - AI learns your preferences

💎 PREMIUM FEATURES:
• Unlimited song analysis
• Advanced harmony breakdowns
• Priority support
• Ad-free experience
• Offline mode
• Early access to new features

🌍 OPEN SOURCE:
CladeAI is proudly open source. Contribute at github.com/cladeai

Download now and join 1 million music enthusiasts!
```

### Category & Tags

- **Category**: Music & Audio
- **Tags**: music discovery, social music, AI recommendations, harmony, chords, spotify, music theory

### Screenshots Required

1. Feed screen showing social activity
2. Track detail with harmony analysis
3. Player interface with controls
4. Search and discovery
5. Profile with listening stats
6. Premium features showcase

## Google Play Console Setup

### 1. Create App

```bash
# Go to: https://play.google.com/console
# Create new app
# Fill app details
```

### 2. Generate Upload Key

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore cladeai-upload-key.keystore \
  -alias cladeai \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 3. Upload First Release

```bash
# Build signed AAB
cd android
./gradlew bundleRelease

# Upload manually to Play Console for first release
# Later releases will use automated workflow
```

## Environment Variables

Create `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REVENUECAT_ANDROID_KEY=your-revenuecat-android-key
GOOGLE_SERVICES_JSON_BASE64=your-google-services-json-base64
```

## Premium Billing Configuration

### RevenueCat Setup

1. Create RevenueCat account: https://app.revenuecat.com
2. Create Android app in dashboard
3. Configure products:
   - **monthly**: $9.99/month - Premium Monthly
   - **annual**: $89.99/year - Premium Annual (save 25%)
   - **lifetime**: $199.99 - Premium Lifetime
4. Copy Android API key to `.env`

### Google Play Billing Setup

1. Enable Google Play Billing API in Google Cloud Console
2. Create in-app products in Play Console:
   - `premium_monthly` - $9.99
   - `premium_annual` - $89.99
   - `premium_lifetime` - $199.99
3. Link to RevenueCat

## Open Source License

**LICENSE:**

```
MIT License

Copyright (c) 2026 CladeAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

Premium features require a subscription but the codebase remains open source.
```

## Testing

### Unit Tests

```bash
bun test
```

### E2E Tests (Detox)

```bash
# Install Detox
bun install --save-dev detox

# Run E2E tests
detox test --configuration android.emu.debug
```

## Deployment Checklist

- [ ] Generate upload keystore
- [ ] Configure signing in build.gradle
- [ ] Set up RevenueCat account
- [ ] Create Play Console app listing
- [ ] Upload app icon (512x512 PNG)
- [ ] Prepare 8 screenshots per device type
- [ ] Write store listing copy
- [ ] Set up GitHub Actions secrets
- [ ] Test in-app billing in sandbox
- [ ] Submit for review

## Support

- **Documentation**: https://docs.cladeai.com/android
- **Issues**: https://github.com/cladeai/cladeai-android/issues
- **Discord**: https://discord.gg/cladeai
