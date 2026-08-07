import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export default {
  PORT: getEnv("PORT", "5000"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  app_url: getEnv("app_url", "http://localhost:5000"),
  bcryptSaltRounds: getEnv("bcrypt_salt_rounds", "10"),
  jwt_access_Secret: getEnv("jwt_access_Secret"),
  jwt_refresh_Secret: getEnv("jwt_refresh_Secret"),
  jwt_access_ExpiresIn: getEnv("jwt_access_ExpiresIn", "1d"),
  jwt_refresh_ExpiresIn: getEnv("jwt_refresh_ExpiresIn", "7d"),
};
