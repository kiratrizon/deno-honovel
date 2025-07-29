const constant = {
  multipart: env("MAX_FILE_SIZE", "10M"),
  json: env("MAX_CONTENT_LENGTH", "1M"),
  urlencoded: env("MAX_CONTENT_LENGTH", "1M"),
  text: env("MAX_CONTENT_LENGTH", "1M"),
  octet: env("MAX_CONTENT_LENGTH", "1M"),
  xml: env("MAX_CONTENT_LENGTH", "500K"),
  csv: env("MAX_CONTENT_LENGTH", "500K"),
};
export default constant;
