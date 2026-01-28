const originalFetch = window.fetch;

window.fetch = (input, init = {}) => {
  init.headers = {
    ...init.headers,
    Accept: "application/json",
  };
  return originalFetch(input, init);
};
