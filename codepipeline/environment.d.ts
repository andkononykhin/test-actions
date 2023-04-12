declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SOURCE_REPO_URL: string;
      WEBHOOK_TRIGGER: string;
    }
  }
}

export {}
