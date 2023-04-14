// FIXME need to add to git
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REPO_FULL_NAME: string;
      REF: string;
      REF_TYPE: string;
    }
  }
}

export {}
