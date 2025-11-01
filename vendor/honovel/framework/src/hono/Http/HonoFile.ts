import { FormFile } from "multiParser2";

export default class HonoFile {
    public name: string;
    public filename: string | undefined;
    public contentType: string | undefined;
    public size: number | undefined;

    #content: FormFile["content"];
    constructor(file: FormFile) {
        if (!file) {
            throw new Error("File is empty");
        }

        this.name = file.name;
        this.filename = file.filename;
        this.contentType = file.contentType;
        this.size = file.size;
        this.#content = file.content;
    }

    getContent(): Uint8Array {
        if (!this.#content) return new Uint8Array();
        return new Uint8Array(Object.values(this.#content));
    }

}
