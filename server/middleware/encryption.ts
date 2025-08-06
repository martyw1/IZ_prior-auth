import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string): { encrypted: string; authTag: string; iv: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('medauth-pro', 'utf8'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  };
};

export const decrypt = (encrypted: string, authTag: string, iv: string): string => {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('medauth-pro', 'utf8'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

export const encryptPHI = (data: any): string => {
  const jsonString = JSON.stringify(data);
  const result = encrypt(jsonString);
  return JSON.stringify(result);
};

export const decryptPHI = (encryptedData: string): any => {
  const { encrypted, authTag, iv } = JSON.parse(encryptedData);
  const decrypted = decrypt(encrypted, authTag, iv);
  return JSON.parse(decrypted);
};

export const hashSensitiveData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};
