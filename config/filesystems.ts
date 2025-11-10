import { FileSystemConfig } from "./@types/index.d.ts";

const filesystems: FileSystemConfig = {
  default: env("FILESYSTEM_DISK", "local") as string,

  disks: {
    local: {
      driver: "local",
      root: storagePath(),
    },

    public: {
      driver: "public",
      root: storagePath("public"),
      url: env("APP_URL") + "/storage",
      visibility: "public",
    },

    s3: {
      driver: "s3",
      key: env("AWS_ACCESS_KEY_ID"),
      secret: env("AWS_SECRET_ACCESS_KEY"),
      region: env("AWS_DEFAULT_REGION"),
      bucket: env("AWS_BUCKET"),
    },
  },
};

export default filesystems;
