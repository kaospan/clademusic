# Mobile CI/CD Setup Guide

## Overview

Complete CI/CD pipeline configuration for Android and iOS mobile apps using GitHub Actions.

## Repository Secrets Required

### Android Secrets

```bash
SUPABASE_URL                    # https://your-project.supabase.co
SUPABASE_ANON_KEY               # Your Supabase anon key
REVENUECAT_ANDROID_KEY          # RevenueCat Android API key
KEYSTORE_BASE64                 # Base64 encoded keystore file
KEYSTORE_PASSWORD               # Keystore password
KEY_ALIAS                       # Key alias
KEY_PASSWORD                    # Key password
GOOGLE_PLAY_SERVICE_ACCOUNT     # Service account JSON for Play Store uploads
```

### iOS Secrets

```bash
SUPABASE_URL                    # https://your-project.supabase.co
SUPABASE_ANON_KEY               # Your Supabase anon key
REVENUECAT_IOS_KEY              # RevenueCat iOS API key
MATCH_PASSWORD                  # Fastlane Match password
FASTLANE_USER                   # Apple ID email
FASTLANE_PASSWORD               # Apple ID password
FASTLANE_APP_PASSWORD           # App-specific password
APPLE_TEAM_ID                   # Apple Developer Team ID
```

### Web Performance Testing

```bash
APP_URL                         # https://your-app-url.com
PLAYWRIGHT_BROWSERS_PATH        # Path for Playwright browsers cache
```

## Setting Up Secrets

### 1. Encode Android Keystore

```bash
# Generate keystore (if not exists)
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore cladeai-release.keystore \
  -alias cladeai \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Encode to base64
base64 cladeai-release.keystore > keystore.base64

# Add to GitHub Secrets as KEYSTORE_BASE64
```

### 2. Create Google Play Service Account

```bash
# Go to Google Cloud Console
# Create service account with "Service Account User" role
# Download JSON key
# Add to GitHub Secrets as GOOGLE_PLAY_SERVICE_ACCOUNT
```

### 3. Create Apple App-Specific Password

```bash
# Go to: https://appleid.apple.com/account/manage
# Sign in with Apple ID
# Generate app-specific password
# Add to GitHub Secrets as FASTLANE_APP_PASSWORD
```

### 4. Setup Fastlane Match

```bash
# Create private git repository for certificates
# Initialize Match
fastlane match init

# Generate certificates
fastlane match appstore
fastlane match development

# Add MATCH_PASSWORD to GitHub Secrets
```

## Workflow Files

### Android Build & Deploy

**.github/workflows/android-ci.yml:**

```yaml
name: Android CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  release:
    types: [published]

jobs:
  test:
    name: Run Tests
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
      
      - name: Run linter
        run: bun run lint
      
      - name: Run unit tests
        run: bun test
      
      - name: Run E2E tests
        run: bun run test:e2e:android

  build:
    name: Build APK
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
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
      
      - name: Decode Keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo $KEYSTORE_BASE64 | base64 -d > android/app/release.keystore
      
      - name: Build Release APK
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          REVENUECAT_ANDROID_KEY: ${{ secrets.REVENUECAT_ANDROID_KEY }}
          KEYSTORE_FILE: release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew assembleRelease
      
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release-${{ github.sha }}
          path: android/app/build/outputs/apk/release/app-release.apk
          retention-days: 30

  deploy:
    name: Deploy to Play Store
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    
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
          REVENUECAT_ANDROID_KEY: ${{ secrets.REVENUECAT_ANDROID_KEY }}
          KEYSTORE_FILE: release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew bundleRelease
      
      - name: Upload to Play Console
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.cladeai.app
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: production
          status: completed
          whatsNewDirectory: distribution/whatsnew
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          text: 'Android app deployed to Play Store'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### iOS Build & Deploy

**.github/workflows/ios-ci.yml:**

```yaml
name: iOS CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  release:
    types: [published]

jobs:
  test:
    name: Run Tests
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
      
      - name: Run linter
        run: bun run lint
      
      - name: Run unit tests
        run: bun test
      
      - name: Run iOS tests
        run: |
          cd ios
          xcodebuild test \
            -workspace CladeAI.xcworkspace \
            -scheme CladeAI \
            -destination 'platform=iOS Simulator,name=iPhone 15'

  build:
    name: Build IPA
    needs: test
    runs-on: macos-14
    if: github.event_name == 'push'
    
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
      
      - name: Install Fastlane
        run: sudo gem install fastlane
      
      - name: Setup Certificates
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          cd ios
          fastlane match development --readonly
          fastlane match appstore --readonly
      
      - name: Build Archive
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          REVENUECAT_IOS_KEY: ${{ secrets.REVENUECAT_IOS_KEY }}
        run: |
          cd ios
          xcodebuild archive \
            -workspace CladeAI.xcworkspace \
            -scheme CladeAI \
            -configuration Release \
            -archivePath build/CladeAI.xcarchive
      
      - name: Export IPA
        run: |
          cd ios
          xcodebuild -exportArchive \
            -archivePath build/CladeAI.xcarchive \
            -exportPath build \
            -exportOptionsPlist ExportOptions.plist
      
      - name: Upload IPA Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release-${{ github.sha }}
          path: ios/build/CladeAI.ipa
          retention-days: 30

  deploy-testflight:
    name: Deploy to TestFlight
    needs: build
    runs-on: macos-14
    if: github.ref == 'refs/heads/develop'
    
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
        run: sudo gem install fastlane
      
      - name: Upload to TestFlight
        env:
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_APP_PASSWORD }}
        run: |
          cd ios
          fastlane beta

  deploy-appstore:
    name: Deploy to App Store
    needs: build
    runs-on: macos-14
    if: github.event_name == 'release'
    
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
        run: sudo gem install fastlane
      
      - name: Upload to App Store
        env:
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_APP_PASSWORD }}
        run: |
          cd ios
          fastlane release
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          text: 'iOS app deployed to App Store'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Performance Tests

**.github/workflows/performance-tests.yml:**

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC
  workflow_dispatch:

jobs:
  performance-tests:
    name: Run Performance Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'bun'
      
      - name: Install dependencies
        run: bun ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run Performance Tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          APP_URL: ${{ secrets.APP_URL }}
        run: |
          bun run test:performance
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: performance-report-${{ github.sha }}
          path: performance-report.json
          retention-days: 90
      
      - name: Send Email Report
        if: always()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          subject: 'CladeAI Performance Test Report - ${{ github.run_number }}'
          to: dev@cladeai.com,qa@cladeai.com
          from: CI/CD <noreply@cladeai.com>
          body: |
            Performance tests completed for CladeAI.
            
            View full report in the GitHub Actions artifacts.
            Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          attachments: performance-report.json
```

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:performance": "ts-node scripts/performance-tests.ts",
    "test:e2e:android": "detox test --configuration android.emu.release",
    "test:e2e:ios": "detox test --configuration ios.sim.release",
    "android:build": "cd android && ./gradlew assembleRelease",
    "android:bundle": "cd android && ./gradlew bundleRelease",
    "ios:build": "cd ios && xcodebuild -workspace CladeAI.xcworkspace -scheme CladeAI -configuration Release",
    "ios:archive": "cd ios && fastlane beta",
    "mobile:setup": "bun run android:setup && bun run ios:setup",
    "android:setup": "cd android && ./gradlew wrapper",
    "ios:setup": "cd ios && pod install"
  }
}
```

## Branch Protection Rules

### Main Branch

```yaml
Required status checks:
  - Android CI/CD / test
  - iOS CI/CD / test
  - Require branches to be up to date

Require pull request reviews:
  - Required approving reviews: 1
  - Dismiss stale reviews: true

Restrict pushes:
  - Allow only admins and release managers
```

### Develop Branch

```yaml
Required status checks:
  - Android CI/CD / test
  - iOS CI/CD / test

Require pull request reviews:
  - Required approving reviews: 1
```

## Environment Variables

### Android `android/local.properties`

```properties
sdk.dir=/Users/username/Library/Android/sdk
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REVENUECAT_ANDROID_KEY=your-android-key
```

### iOS `.env`

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REVENUECAT_IOS_KEY=your-ios-key
```

## Deployment Checklist

- [ ] Add all GitHub Secrets
- [ ] Configure branch protection rules
- [ ] Setup Fastlane Match repository
- [ ] Generate Android keystore and encode
- [ ] Create Google Play service account
- [ ] Setup App Store Connect API key
- [ ] Configure RevenueCat products
- [ ] Test CI/CD pipelines on feature branch
- [ ] Setup Slack notifications (optional)
- [ ] Configure email reporting
- [ ] Schedule performance tests

## Support

- **Documentation**: https://docs.cladeai.com/cicd
- **Issues**: https://github.com/cladeai/cladeai-web/issues
