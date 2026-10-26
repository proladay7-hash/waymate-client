const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

try {
  if (fs.existsSync(targetFile)) {
    const patchedContent = `import { requireOptionalNativeModule } from 'expo';

const fallback = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

const nativeMod = typeof requireOptionalNativeModule === 'function' ? requireOptionalNativeModule('ExpoTopicSubscriptionModule') : null;
export default nativeMod || fallback;
`;
    fs.writeFileSync(targetFile, patchedContent, 'utf8');
    console.log('[patch-expo-notifications] Applied ExpoTopicSubscriptionModule fallback for Expo Go');
  }
} catch (err) {
  console.warn('[patch-expo-notifications] Could not patch file:', err.message);
}
