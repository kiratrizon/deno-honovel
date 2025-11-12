import HonoFile from "HonoHttp/HonoFile.ts";
import { Image as ImageService } from "imagescript";

export class Image {
  constructor(private image: HonoFile) {
    if (!this.validateImage()) {
      throw new Error("Invalid image file");
    }
  }

  private validateImage(): boolean {
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!this.image.valid()) {
      return false;
    }
    return validTypes.includes(this.image.contentType as string);
  }

  public async resize(width: number, height: number): Promise<Uint8Array> {
    const imgBuffer = this.image._getContent();
    const image = await ImageService.decode(imgBuffer);
    if (!image) throw new Error("Failed to decode image");

    const resized = image.resize(width, height);

    let outputBuffer: Uint8Array;

    switch (this.image.contentType) {
      case "image/png":
        outputBuffer = await resized.encode(6); // compression 0-9
        break;
      case "image/jpeg":
        outputBuffer = await resized.encode(90); // quality 1-100
        break;
      case "image/gif":
        outputBuffer = await resized.encode(); // compression ignored
        break;
      default:
        throw new Error("Unsupported image type");
    }

    return outputBuffer;
  }
}
