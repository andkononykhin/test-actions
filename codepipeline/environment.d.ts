declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SOURCE_REPO_URL: string;
      WEBHOOK_TRIGGER: string;
      REF_TYPE: string;
      REF: string;
    }
  }
}

export {}
