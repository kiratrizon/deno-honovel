import { CacheConfig } from "./@types/index.d.ts";

const constant: CacheConfig = {
    default: env("CACHE_DRIVER", "file"),
    stores: {
        file: {
            driver: "file",
            path: storagePath("framework/cache/data"),
        }
    }
}

export default constant;