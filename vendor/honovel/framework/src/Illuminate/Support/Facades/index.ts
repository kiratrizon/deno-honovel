import {
    hashSync,
    compareSync,
} from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

interface HashOptions {
    rounds?: number;
}

class Hash {
    /**
     * Hash a value with optional rounds (cost factor).
     */
    public static make(value: string, options: HashOptions = {}): string {
        const rounds = options.rounds ?? 10;
        return hashSync(value, String(rounds));
    }

    /**
     * Compare a plain value with a hash.
     */
    public static check(value: string, hash: string): boolean {
        return compareSync(value, hash);
    }
}

export default Hash;
