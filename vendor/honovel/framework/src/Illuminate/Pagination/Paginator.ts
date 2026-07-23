import Collection from "../Database/Eloquent/Collection.ts";

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
    /** No navigation (previous/next at bounds, or ellipsis) */
    disabled?: boolean;
};

export default class Paginator<T extends Record<string, unknown>> {
    private data: T[];
    private total: number;
    private page: number;
    private perPage: number;
    private totalPages: number;
    private nextPage: number | null;
    private prevPage: number | null;
    private nextUrl: string | null;
    private prevUrl: string | null;
    private baseUrl?: URL;

    private static defaultStyle: "bootstrap" | "tailwind" = "tailwind";

    constructor(
        data: T[],
        total: number,
        page: number,
        perPage: number = 10,
        url?: URL,
    ) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.perPage = perPage;
        this.totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
        this.baseUrl = url;

        const safePage = Math.min(Math.max(1, page), this.totalPages);
        this.page = safePage;

        this.nextPage = safePage < this.totalPages ? safePage + 1 : null;
        this.prevPage = safePage > 1 ? safePage - 1 : null;

        this.nextUrl = this.nextPage ? this.#buildPageUrl(this.nextPage) : null;
        this.prevUrl = this.prevPage ? this.#buildPageUrl(this.prevPage) : null;
    }

    #buildPageUrl(targetPage: number): string {
        // If no URL is provided, default to "/" as the base
        const clone = this.baseUrl
            ? new URL(this.baseUrl.toString())
            : new URL("/", config("app").url || "http://localhost"); // temporary host just to satisfy URL

        clone.searchParams.set("page", String(targetPage));
        clone.searchParams.set("perPage", String(this.perPage));
        clone.searchParams.set("total", String(this.total));
        clone.searchParams.set("totalPages", String(this.totalPages));

        // Remove host if we didn't have a baseUrl
        if (!this.baseUrl) {
            return clone.pathname + clone.search;
        }

        return clone.toString();
    }

    /** Neighbor window around current page; always includes 1 and last when space is tight */
    #pageSequence(): (number | "ellipsis")[] {
        const last = this.totalPages;
        const c = this.page;
        if (last <= 9) {
            return Array.from({ length: last }, (_, i) => i + 1);
        }
        const window = 2;
        const left = Math.max(2, c - window);
        const right = Math.min(last - 1, c + window);

        const seq: (number | "ellipsis")[] = [1];
        if (left > 2) seq.push("ellipsis");
        for (let i = left; i <= right; i++) seq.push(i);
        if (right < last - 1) seq.push("ellipsis");
        seq.push(last);
        return seq;
    }

    /** Return raw data array */
    public getData() {
        return this.data;
    }

    /** Return meta info like Laravel's LengthAwarePaginator */
    public getMeta() {
        return {
            total: this.total,
            perPage: this.perPage,
            currentPage: this.page,
            lastPage: this.totalPages,
            nextPage: this.nextPage,
            prevPage: this.prevPage,
            nextUrl: this.nextUrl,
            prevUrl: this.prevUrl,
        };
    }

    /**
     * Page links in order: « Previous, numeric pages (with …), Next ».
     * `style` is unused here; use `html()` for styled markup.
     */
    public links(_style: "bootstrap" | "tailwind" = Paginator.defaultStyle): PaginationLink[] {
        void _style;
        const out: PaginationLink[] = [];

        out.push({
            url: this.prevUrl,
            label: "« Previous",
            active: false,
            disabled: this.prevPage === null,
        });

        for (const item of this.#pageSequence()) {
            if (item === "ellipsis") {
                out.push({
                    url: null,
                    label: "…",
                    active: false,
                    disabled: true,
                });
                continue;
            }
            out.push({
                url: this.#buildPageUrl(item),
                label: String(item),
                active: item === this.page,
            });
        }

        out.push({
            url: this.nextUrl,
            label: "Next »",
            active: false,
            disabled: this.nextPage === null,
        });

        return out;
    }

    /**
     * Full pagination markup with Tailwind or Bootstrap classes.
     */
    public html(style: "bootstrap" | "tailwind" = Paginator.defaultStyle): string {
        const items = this.links();
        if (style === "bootstrap") {
            const lis = items
                .map((link) => {
                    if (link.label === "…") {
                        return `<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`;
                    }
                    if (link.disabled || link.url === null) {
                        const cls = link.active ? " active" : " disabled";
                        return `<li class="page-item${cls}"><span class="page-link">${this.#escapeHtml(link.label)}</span></li>`;
                    }
                    if (link.active) {
                        return `<li class="page-item active" aria-current="page"><span class="page-link">${this.#escapeHtml(link.label)}</span></li>`;
                    }
                    return `<li class="page-item"><a class="page-link" href="${this.#escapeAttr(link.url)}">${this.#escapeHtml(link.label)}</a></li>`;
                })
                .join("\n");

            return `<nav aria-label="Pagination"><ul class="pagination justify-content-center flex-wrap gap-1 mb-0">${lis}</ul></nav>`;
        }

        // tailwind
        const baseItem =
            "inline-flex items-center justify-center min-w-[2.25rem] px-3 py-1.5 text-sm font-medium rounded-md border transition-colors";
        const idle =
            "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
        const active =
            "border-indigo-600 bg-indigo-600 text-white shadow-sm dark:border-indigo-500 dark:bg-indigo-600";
        const disabledCls =
            "opacity-45 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500";

        const parts = items.map((link) => {
            if (link.label === "…") {
                return `<span class="${baseItem} ${disabledCls}" aria-hidden="true">&hellip;</span>`;
            }
            if (link.disabled || link.url === null) {
                const cls = link.active ? `${baseItem} ${active}` : `${baseItem} ${disabledCls}`;
                return `<span class="${cls}" ${link.active ? 'aria-current="page"' : ""}>${this.#escapeHtml(link.label)}</span>`;
            }
            if (link.active) {
                return `<span class="${baseItem} ${active}" aria-current="page">${this.#escapeHtml(link.label)}</span>`;
            }
            return `<a href="${this.#escapeAttr(link.url)}" class="${baseItem} ${idle}">${this.#escapeHtml(link.label)}</a>`;
        });

        return `<nav class="flex flex-wrap items-center justify-center gap-1.5 py-4" aria-label="Pagination">${parts.join("")}</nav>`;
    }

    #escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    #escapeAttr(url: string): string {
        return url.replace(/"/g, "&quot;");
    }

    /** Optional: set default style for `html()` */
    public static setDefaultStyle(style: "bootstrap" | "tailwind") {
        Paginator.defaultStyle = style;
    }

    toObject(): Record<string, unknown> {
        return {
            data: this.data instanceof Collection ? this.data.toArray() : this.data,
            total: this.total,
            page: this.page,
            perPage: this.perPage,
            totalPages: this.totalPages,
            nextPage: this.nextPage,
            prevPage: this.prevPage,
            nextUrl: this.nextUrl,
            prevUrl: this.prevUrl,
        };
    }

    static useBootstrap(): void {
        Paginator.defaultStyle = "bootstrap";
    }

    static useTailwind(): void {
        Paginator.defaultStyle = "tailwind";
    }
}
