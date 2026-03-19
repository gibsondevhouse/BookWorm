import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number
) => Promise<Buffer>;
const passwordHashPrefix = "scrypt";
const keyLength = 64;

const deriveKey = async (password: string, salt: string): Promise<Buffer> => {
  return scrypt(password, salt, keyLength);
};

export const passwordHasher = {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = await deriveKey(password, salt);

    return `${passwordHashPrefix}$${salt}$${derivedKey.toString("hex")}`;
  },

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const [prefix, salt, storedHash] = passwordHash.split("$");

    if (prefix !== passwordHashPrefix || !salt || !storedHash) {
      return false;
    }

    const storedBuffer = Buffer.from(storedHash, "hex");
    const derivedKey = await deriveKey(password, salt);

    if (storedBuffer.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(storedBuffer, derivedKey);
  }
};