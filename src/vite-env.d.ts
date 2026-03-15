/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGODEV_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
