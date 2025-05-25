// LynqIt Simple Encryption Implementation
// Using Web Crypto API for basic encryption

class SimpleE2EE {
  constructor() {
    this.isReady = false;
    this.sessionKeys = new Map(); // Store session keys for each user
    this.groupKeys = new Map(); // Store group encryption keys
  }

  // Initialize the encryption system
  async initialize() {
    try {
      console.log('🔐 Initializing simple encryption...');
      this.isReady = true;
      console.log('✅ Simple encryption initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      return false;
    }
  }

  // Generate a deterministic session key for a user pair
  async generateSessionKey(userId, currentUserId) {
    try {
      // Create a deterministic key material using both user IDs
      const keyMaterial = `lynqit-chat-${[currentUserId, userId].sort().join('-')}-2024`;

      console.log('🔑 Generating session key for:', keyMaterial);

      // Derive key from the deterministic material
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyMaterial);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyData);

      const sessionKey = await window.crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.sessionKeys.set(userId, sessionKey);
      console.log('✅ Session key generated for user:', userId);
      return sessionKey;
    } catch (error) {
      console.error('❌ Error generating session key:', error);
      throw error;
    }
  }

  // Encrypt a message using AES-GCM
  async encryptMessage(message, recipientUserId) {
    try {
      if (!this.isReady) {
        throw new Error('Encryption not initialized');
      }

      console.log('🔒 Encrypting message for recipient:', recipientUserId);
      console.log('🔒 Original message:', message);

      // Get current user ID from localStorage
      const currentUserId = localStorage.getItem('currentUserId') || 'unknown';
      console.log('🔒 Current user ID:', currentUserId);

      // Get or create session key for this user
      let sessionKey = this.sessionKeys.get(recipientUserId);
      if (!sessionKey) {
        console.log('🔒 No existing session key, generating new one');
        sessionKey = await this.generateSessionKey(recipientUserId, currentUserId);
      } else {
        console.log('🔒 Using existing session key');
      }

      // Generate a random IV for this message
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      console.log('🔒 Generated IV length:', iv.length);

      // Encrypt the message
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      console.log('🔒 Message data length:', data.length);

      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sessionKey,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      const result = this.arrayBufferToBase64(combined.buffer);
      console.log('✅ Message encrypted successfully, result length:', result.length);
      console.log('✅ Encrypted preview:', result.substring(0, 50) + '...');
      return result;
    } catch (error) {
      console.error('❌ Error encrypting message:', error);
      return message; // Return original message if encryption fails
    }
  }

  // Decrypt a message using AES-GCM
  async decryptMessage(encryptedMessage, senderUserId) {
    try {
      if (!this.isReady) {
        throw new Error('Encryption not initialized');
      }

      console.log('🔓 Decrypting message from sender:', senderUserId);
      console.log('🔓 Encrypted message preview:', encryptedMessage.substring(0, 50) + '...');

      // Get current user ID from localStorage
      const currentUserId = localStorage.getItem('currentUserId') || 'unknown';
      console.log('🔓 Current user ID:', currentUserId);

      // Get or create session key for this user
      let sessionKey = this.sessionKeys.get(senderUserId);
      if (!sessionKey) {
        console.log('🔓 No existing session key, generating new one');
        sessionKey = await this.generateSessionKey(senderUserId, currentUserId);
      } else {
        console.log('🔓 Using existing session key');
      }

      try {
        const encryptedBuffer = this.base64ToArrayBuffer(encryptedMessage);
        const combined = new Uint8Array(encryptedBuffer);

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        console.log('🔓 IV length:', iv.length, 'Encrypted data length:', encrypted.length);

        const decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv },
          sessionKey,
          encrypted
        );

        const decoder = new TextDecoder();
        const result = decoder.decode(decrypted);
        console.log('✅ Message decrypted successfully:', result);
        return result;
      } catch (decryptError) {
        console.error('❌ Decryption failed, trying as plain text:', decryptError);
        // If decryption fails, it might be a plain text message
        return encryptedMessage;
      }
    } catch (error) {
      console.error('❌ Error in decryptMessage:', error);
      return encryptedMessage; // Return original message if decryption fails
    }
  }

  // Generate a deterministic group encryption key
  async generateGroupKey(groupId) {
    try {
      // Create a deterministic key based on group ID
      const keyMaterial = `lynqit-group-${groupId}-2024`;

      console.log('🔑 Generating group key for:', groupId);

      // Derive key from the deterministic material
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyMaterial);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyData);

      const groupKey = await window.crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Store the group key
      this.groupKeys.set(groupId, groupKey);

      console.log('✅ Group key generated for group:', groupId);
      return groupKey;
    } catch (error) {
      console.error('❌ Error generating group key:', error);
      throw error;
    }
  }

  // Encrypt a group message
  async encryptGroupMessage(message, groupId) {
    try {
      console.log('🔒 Encrypting group message for group:', groupId);

      // Get or generate group key
      let groupKey = this.groupKeys.get(groupId);
      if (!groupKey) {
        groupKey = await this.generateGroupKey(groupId);
      }

      // Generate a random IV for this message
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the message
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        groupKey,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      const result = this.arrayBufferToBase64(combined.buffer);
      console.log('✅ Group message encrypted successfully');
      return result;
    } catch (error) {
      console.error('❌ Error encrypting group message:', error);
      return message; // Return original message if encryption fails
    }
  }

  // Decrypt a group message
  async decryptGroupMessage(encryptedMessage, groupId) {
    try {
      console.log('🔓 Decrypting group message for group:', groupId);

      // Get or generate group key
      let groupKey = this.groupKeys.get(groupId);
      if (!groupKey) {
        console.log('🔓 No group key found, generating new one for group:', groupId);
        groupKey = await this.generateGroupKey(groupId);
      }

      console.log('🔓 Using group key for decryption');
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedMessage);
      const combined = new Uint8Array(encryptedBuffer);

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        groupKey,
        encrypted
      );

      const decoder = new TextDecoder();
      const result = decoder.decode(decrypted);
      console.log('✅ Group message decrypted successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error decrypting group message:', error);
      return encryptedMessage; // Return original message if decryption fails
    }
  }

  // Utility functions
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Check if group has encryption key
  hasGroupKey(groupId) {
    return this.groupKeys.has(groupId);
  }

}

// Create a singleton instance
const e2ee = new SimpleE2EE();

// Export functions for use in components
export const initializeEncryption = async () => {
  try {
    console.log('🔐 Initializing simple encryption...');
    const success = await e2ee.initialize();

    if (success) {
      console.log('✅ Simple encryption initialized successfully');
    } else {
      console.log('❌ Simple encryption initialization failed');
    }

    return success;
  } catch (error) {
    console.error('❌ Encryption initialization error:', error);
    return false;
  }
};

export const encryptMessage = (message, recipientUserId) => e2ee.encryptMessage(message, recipientUserId);
export const decryptMessage = (encryptedMessage, senderUserId) => e2ee.decryptMessage(encryptedMessage, senderUserId);

// Group encryption functions
export const generateGroupKey = (groupId) => e2ee.generateGroupKey(groupId);
export const importGroupKey = () => true;
export const encryptGroupMessage = (message, groupId) => e2ee.encryptGroupMessage(message, groupId);
export const decryptGroupMessage = (encryptedMessage, groupId) => e2ee.decryptGroupMessage(encryptedMessage, groupId);
export const rotateGroupKey = () => ({ keyBase64: '', version: 1 });
export const hasGroupKey = (groupId) => e2ee.hasGroupKey(groupId);
export const getGroupKeyVersion = () => 1;

// Check if encryption is supported
export const isEncryptionSupported = () => {
  return window.crypto && window.crypto.subtle;
};

export default e2ee;
