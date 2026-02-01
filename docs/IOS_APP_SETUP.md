# CladeAI iOS App Repository Setup

## Overview

Complete guide for setting up the CladeAI iOS mobile app using React Native with TypeScript, including App Store submission and TestFlight beta testing.

## Repository Structure

```
cladeai-ios/
├── ios/                        # Native iOS code (Xcode project)
│   ├── CladeAI/
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist
│   │   ├── Images.xcassets/
│   │   └── LaunchScreen.storyboard
│   ├── CladeAI.xcodeproj/
│   ├── CladeAI.xcworkspace/
│   ├── Podfile
│   └── Pods/
├── android/                    # Android code (shared codebase)
├── src/                        # React Native TypeScript code
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── api/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── App.tsx
├── __tests__/
├── .github/
│   └── workflows/
│       ├── ios-build.yml
│       ├── ios-test.yml
│       └── ios-release.yml
├── fastlane/                   # Fastlane automation
│   ├── Fastfile
│   ├── Appfile
│   └── Matchfile
├── app.json
├── babel.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Initial Setup

### 1. Prerequisites

```bash
# Install Xcode from App Store (required for iOS development)
# Install Xcode Command Line Tools
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods

# Install Fastlane
sudo gem install fastlane

# Install React Native CLI
bun install -g react-native-cli
```

### 2. Create Repository

```bash
# Create new directory
mkdir cladeai-ios
cd cladeai-ios

# Initialize React Native project
npx react-native@latest init CladeAI --template react-native-template-typescript

# Initialize git
git init
git remote add origin https://github.com/yourusername/cladeai-ios.git

# Install iOS dependencies
cd ios
pod install
cd ..
```

### 3. Install Dependencies

```bash
# Same as Android - shared React Native codebase
bun install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
bun install react-native-screens react-native-safe-area-context
bun install react-native-gesture-handler react-native-reanimated
bun install zustand
bun install @supabase/supabase-js
bun install axios @tanstack/react-query
bun install react-native-paper react-native-vector-icons react-native-svg
bun install react-native-track-player
bun install react-native-iap react-native-purchases  # RevenueCat

# iOS-specific
bun install @react-native-firebase/app @react-native-firebase/messaging

# Install pods
cd ios && pod install && cd ..
```

### 4. Configure Xcode Project

**Info.plist Configuration:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>CladeAI</string>
    <key>CFBundleIdentifier</key>
    <string>com.cladeai.app</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    
    <!-- Privacy Descriptions -->
    <key>NSCameraUsageDescription</key>
    <string>CladeAI needs camera access to upload profile pictures</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>CladeAI needs photo library access to select images</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>CladeAI needs microphone access for audio recording features</string>
    <key>NSAppleMusicUsageDescription</key>
    <string>CladeAI integrates with Apple Music for music playback</string>
    
    <!-- Background Modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>audio</string>
        <string>fetch</string>
        <string>remote-notification</string>
    </array>
    
    <!-- App Transport Security -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
    </dict>
</dict>
</plist>
```

## Xcode Configuration

### Signing & Capabilities

1. Open `ios/CladeAI.xcworkspace` in Xcode
2. Select CladeAI target
3. Go to "Signing & Capabilities"
4. Enable capabilities:
   - ✅ Push Notifications
   - ✅ Background Modes (Audio, Fetch, Remote notifications)
   - ✅ In-App Purchase
   - ✅ Associated Domains (for deep linking)

### Build Settings

**ios/CladeAI.xcodeproj/project.pbxproj:**

```ruby
PRODUCT_BUNDLE_IDENTIFIER = com.cladeai.app
MARKETING_VERSION = 1.0.0
CURRENT_PROJECT_VERSION = 1
IPHONEOS_DEPLOYMENT_TARGET = 14.0
SWIFT_VERSION = 5.0
```

## Premium Billing (iOS)

### StoreKit Configuration

**src/services/billing.ios.ts:**

```typescript
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import Config from 'react-native-config';

export const initializeBilling = async (userId: string) => {
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  await Purchases.configure({
    apiKey: Config.REVENUECAT_IOS_KEY!,
    appUserID: userId,
  });
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
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
    } else {
      console.error('Purchase error:', error);
    }
    return false;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (error) {
    console.error('Restore error:', error);
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

### Premium Features Screen

**src/screens/PremiumScreen.tsx:**

```typescript
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, ActivityIndicator } from 'react-native-paper';
import { getOfferings, purchasePremium, restorePurchases } from '../services/billing.ios';
import type { PurchasesOffering } from 'react-native-purchases';

export default function PremiumScreen() {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setLoading(true);
    const data = await getOfferings();
    setOfferings(data);
    setLoading(false);
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(true);
    const success = await purchasePremium(packageId);
    setPurchasing(false);

    if (success) {
      Alert.alert('Success!', 'Welcome to CladeAI Premium! 🎉');
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const restored = await restorePurchases();
    setPurchasing(false);

    if (restored) {
      Alert.alert('Restored!', 'Your premium subscription has been restored.');
    } else {
      Alert.alert('No Purchases', 'No previous purchases found.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const packages = offerings?.availablePackages || [];

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.header}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            ✨ Go Premium
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Unlock all features and support open source development
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.features}>
        {PREMIUM_FEATURES.map((feature, index) => (
          <Card key={index} style={styles.featureCard}>
            <Card.Content>
              <Text variant="titleMedium">{feature.icon} {feature.title}</Text>
              <Text variant="bodyMedium" style={styles.featureDesc}>
                {feature.description}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <View style={styles.packages}>
        {packages.map((pkg) => (
          <Card key={pkg.identifier} style={styles.packageCard}>
            <Card.Content>
              <Text variant="titleLarge">{pkg.product.title}</Text>
              <Text variant="headlineMedium" style={styles.price}>
                {pkg.product.priceString}
              </Text>
              <Text variant="bodyMedium">{pkg.product.description}</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handlePurchase(pkg.identifier)}
                disabled={purchasing}
                style={styles.purchaseButton}
              >
                Subscribe
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </View>

      <Button
        mode="text"
        onPress={handleRestore}
        disabled={purchasing}
        style={styles.restoreButton}
      >
        Restore Purchases
      </Button>
    </ScrollView>
  );
}

const PREMIUM_FEATURES = [
  {
    icon: '🎵',
    title: 'Unlimited Song Analysis',
    description: 'Analyze as many tracks as you want with AI-powered harmony detection',
  },
  {
    icon: '🎹',
    title: 'Advanced Music Theory',
    description: 'Deep dive into chord progressions, scales, and harmonic analysis',
  },
  {
    icon: '⚡',
    title: 'Priority Support',
    description: 'Get help faster with premium support channels',
  },
  {
    icon: '🚀',
    title: 'Early Access',
    description: 'Be the first to try new features before public release',
  },
  {
    icon: '📱',
    title: 'Ad-Free Experience',
    description: 'Enjoy CladeAI without any advertisements',
  },
  {
    icon: '💾',
    title: 'Offline Mode',
    description: 'Download tracks and listen without internet connection',
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { margin: 16, backgroundColor: '#6200ee' },
  title: { color: 'white', fontWeight: 'bold' },
  subtitle: { color: 'white', marginTop: 8 },
  features: { padding: 16 },
  featureCard: { marginBottom: 12 },
  featureDesc: { color: '#666', marginTop: 4 },
  packages: { padding: 16 },
  packageCard: { marginBottom: 16, borderWidth: 2, borderColor: '#6200ee' },
  price: { color: '#6200ee', fontWeight: 'bold', marginVertical: 8 },
  purchaseButton: { flex: 1 },
  restoreButton: { margin: 16 },
});
```

## Fastlane Automation

### Fastfile Configuration

**fastlane/Fastfile:**

```ruby
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "CladeAI.xcodeproj")
    build_app(scheme: "CladeAI")
    upload_to_testflight
  end

  desc "Push a new release build to the App Store"
  lane :release do
    increment_build_number(xcodeproj: "CladeAI.xcodeproj")
    build_app(scheme: "CladeAI")
    upload_to_app_store
  end

  desc "Download certificates and provisioning profiles"
  lane :certificates do
    match(type: "appstore")
    match(type: "development")
  end
end
```

**fastlane/Appfile:**

```ruby
app_identifier("com.cladeai.app")
apple_id("your-apple-id@example.com")
team_id("YOUR_TEAM_ID")
```

## GitHub Actions CI/CD

### iOS Build Workflow

**.github/workflows/ios-build.yml:**

```yaml
name: iOS Build

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: macos-14
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'bun'
      
      - name: Install dependencies
        run: bun ci
      
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
      
      - name: Run tests
        run: bun test
      
      - name: Build iOS app
        run: |
          cd ios
          xcodebuild -workspace CladeAI.xcworkspace \
            -scheme CladeAI \
            -configuration Release \
            -sdk iphoneos \
            -derivedDataPath build \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO \
            CODE_SIGNING_ALLOWED=NO
```

### iOS Release Workflow

**.github/workflows/ios-release.yml:**

```yaml
name: iOS Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-14
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: bun ci
      
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
      
      - name: Install Fastlane
        run: |
          sudo gem install fastlane
      
      - name: Setup certificates
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
        run: |
          cd ios
          fastlane certificates
      
      - name: Build and upload to TestFlight
        env:
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_APP_PASSWORD }}
        run: |
          cd ios
          fastlane beta
```

## App Store Listing

### App Information

- **Name**: CladeAI
- **Subtitle**: Music Discovery & Social
- **Bundle ID**: com.cladeai.app
- **SKU**: cladeai-ios-001
- **Primary Category**: Music
- **Secondary Category**: Social Networking

### Description

```
CladeAI - Where Music Discovery Meets Social Connection

Transform how you discover and share music with our AI-powered platform that brings together 1 million music enthusiasts.

🎵 DISCOVER
• AI recommendations based on your unique taste
• Explore chord progressions and harmony analysis
• Connect with Spotify, Apple Music, and YouTube
• Real-time music theory insights

🌍 CONNECT
• See what your friends are listening to
• Join live discussions on your favorite tracks
• Share reactions and comments
• Build your music community

💎 PREMIUM FEATURES
• Unlimited song analysis and harmony breakdowns
• Advanced music theory deep-dives
• Offline listening mode
• Ad-free experience
• Priority support
• Early access to beta features

🔓 OPEN SOURCE
CladeAI is proudly open source. We believe in transparency and community-driven development. Contribute on GitHub!

📊 TRUSTED BY 1 MILLION USERS
Join a global community of music lovers, DJs, producers, and casual listeners.

SUBSCRIPTION PRICING:
• Monthly: $9.99
• Annual: $89.99 (save 25%)
• Lifetime: $199.99

Payment charged to iTunes Account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.

Privacy Policy: https://cladeai.com/privacy
Terms of Service: https://cladeai.com/terms
```

### Keywords

```
music, discovery, AI, spotify, apple music, youtube, harmony, chords, social, recommendations, music theory, producer, DJ, playlist
```

### Screenshots (6.7" Display)

Required screenshots:
1. **Feed Screen** - Social activity feed with live comments
2. **Track Detail** - Harmony analysis with chord progressions
3. **Player** - Beautiful audio player interface
4. **Search & Discovery** - AI-powered search results
5. **Profile Stats** - Listening history and achievements
6. **Premium Features** - Showcase of premium offerings

### App Preview Video

30-second video showcasing:
- Quick app navigation (5s)
- Track harmony analysis (8s)
- Social feed interaction (7s)
- Premium features (5s)
- Call to action (5s)

## Apple Developer Account Setup

### 1. Enroll in Apple Developer Program

```
Cost: $99/year
URL: https://developer.apple.com/programs/
```

### 2. Create App ID

```bash
# In Apple Developer Portal
Identifiers → App IDs → Create New
- Bundle ID: com.cladeai.app
- Capabilities:
  ✓ Push Notifications
  ✓ In-App Purchase
  ✓ Associated Domains
  ✓ Background Modes
```

### 3. Create Provisioning Profiles

```bash
# Using Fastlane Match
fastlane match init
fastlane match appstore
fastlane match development
```

### 4. App Store Connect Setup

```
1. Go to App Store Connect
2. My Apps → Add New App
3. Fill information:
   - Platform: iOS
   - Name: CladeAI
   - Primary Language: English (U.S.)
   - Bundle ID: com.cladeai.app
   - SKU: cladeai-ios-001
```

## In-App Purchases Setup

### Create Products in App Store Connect

**Products to create:**

1. **Premium Monthly** (`premium_monthly`)
   - Type: Auto-renewable subscription
   - Price: $9.99
   - Duration: 1 month
   - Free trial: 7 days

2. **Premium Annual** (`premium_annual`)
   - Type: Auto-renewable subscription
   - Price: $89.99
   - Duration: 1 year
   - Free trial: 7 days

3. **Premium Lifetime** (`premium_lifetime`)
   - Type: Non-consumable
   - Price: $199.99

### Subscription Group

Create subscription group: "CladeAI Premium"
- Add monthly and annual subscriptions
- Set upgrade/downgrade paths

## RevenueCat Configuration

### Setup Steps

```bash
# 1. Create RevenueCat account
https://app.revenuecat.com

# 2. Add iOS app
- App Name: CladeAI iOS
- Bundle ID: com.cladeai.app
- App Store Connect App-Specific Shared Secret

# 3. Configure products
- Link App Store products to RevenueCat
- Create entitlement: "premium"
- Map products to entitlement

# 4. Copy API key
Settings → API Keys → iOS API Key
```

**Add to .env:**

```bash
REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx
```

## TestFlight Beta Testing

### Internal Testing

```bash
# Upload build via Fastlane
cd ios
fastlane beta

# Add internal testers in App Store Connect
TestFlight → Internal Testing → Add Testers
```

### External Testing

```bash
# Create external test group
TestFlight → External Testing → Create New Group
- Group Name: Beta Testers
- Add beta information
- Submit for review
```

## Privacy Manifest

**ios/CladeAI/PrivacyInfo.xcprivacy:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

## Deployment Checklist

- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create App ID and enable capabilities
- [ ] Generate certificates with Fastlane Match
- [ ] Create App Store Connect listing
- [ ] Configure in-app purchases
- [ ] Set up RevenueCat account
- [ ] Prepare app icon (1024x1024 PNG)
- [ ] Create 6 screenshots per device size
- [ ] Record 30s app preview video
- [ ] Write app description and keywords
- [ ] Set up GitHub Actions secrets
- [ ] Test in-app purchases in sandbox
- [ ] Upload first build to TestFlight
- [ ] Invite beta testers
- [ ] Submit for App Review

## App Review Guidelines

Ensure compliance with:
- **2.1** - App Completeness
- **2.3** - Accurate Metadata
- **3.1** - In-App Purchase (use only StoreKit)
- **4.0** - Design (follow Human Interface Guidelines)
- **5.1** - Privacy (include privacy policy)

## Support & Resources

- **Documentation**: https://docs.cladeai.com/ios
- **Issues**: https://github.com/cladeai/cladeai-ios/issues
- **Discord**: https://discord.gg/cladeai
- **Email**: support@cladeai.com
