export class Str {
    /**
     * Convert string to lowercase.
     */
    static lower(value: string): string {
        return value.toLowerCase();
    }

    /**
     * Convert string to uppercase.
     */
    static upper(value: string): string {
        return value.toUpperCase();
    }

    /**
     * Convert string to studly caps (e.g. "hello_world" => "HelloWorld")
     */
    static studly(value: string): string {
        return value
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .replace(/(?:^|\s)(\w)/g, (_, c) => c.toUpperCase())
            .replace(/\s+/g, "");
    }

    /**
     * Convert string to camel case (e.g. "hello_world" => "helloWorld")
     */
    static camel(value: string): string {
        const studly = this.studly(value);
        return studly.charAt(0).toLowerCase() + studly.slice(1);
    }

    /**
     * Convert string to kebab-case
     */
    static kebab(value: string): string {
        return value
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .replace(/[_\s]+/g, "-")
            .toLowerCase();
    }

    /**
     * Convert string to snake_case
     */
    static snake(value: string): string {
        return value
            .replace(/([a-z])([A-Z])/g, "$1_$2")
            .replace(/[-\s]+/g, "_")
            .toLowerCase();
    }

    /**
     * Check if string contains a given substring
     */
    static contains(haystack: string, needle: string | string[]): boolean {
        if (Array.isArray(needle)) {
            return needle.some(n => haystack.includes(n));
        }
        return haystack.includes(needle);
    }

    /**
     * Check if a string starts with a given value
     */
    static startsWith(haystack: string, needle: string | string[]): boolean {
        if (Array.isArray(needle)) {
            return needle.some(n => haystack.startsWith(n));
        }
        return haystack.startsWith(needle);
    }

    /**
     * Check if a string ends with a given value
     */
    static endsWith(haystack: string, needle: string | string[]): boolean {
        if (Array.isArray(needle)) {
            return needle.some(n => haystack.endsWith(n));
        }
        return haystack.endsWith(needle);
    }

    /**
     * Generate a random alpha-numeric string
     */
    static random(length: number = 16): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        for (let i = 0; i < length; i++) {
            result += chars[bytes[i] % chars.length];
        }
        return result;
    }

    /**
     * Slugify a string (e.g. "Hello World!" => "hello-world")
     */
    static slug(value: string, separator: string = "-"): string {
        return value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9\s]/g, "")     // remove special chars
            .trim()
            .replace(/\s+/g, separator);
    }
}
