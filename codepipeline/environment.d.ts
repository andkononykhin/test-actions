declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CODEBUILD_SOURCE_REPO_URL: string;
      CODEBUILD_WEBHOOK_TRIGGER: string;
    }
  }
}

export {}
