interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

export default class GoogleOAuthClient {
  public static SCOPES = {
    // Basic OpenID scopes
    OPENID: "openid",
    EMAIL: "email",
    PROFILE: "profile",

    // Calendar
    CALENDAR: "https://www.googleapis.com/auth/calendar",
    CALENDAR_READONLY: "https://www.googleapis.com/auth/calendar.readonly",

    // Gmail
    GMAIL_READONLY: "https://www.googleapis.com/auth/gmail.readonly",
    GMAIL_SEND: "https://www.googleapis.com/auth/gmail.send",
    GMAIL_COMPOSE: "https://www.googleapis.com/auth/gmail.compose",
    GMAIL_MODIFY: "https://www.googleapis.com/auth/gmail.modify",
    GMAIL_METADATA: "https://www.googleapis.com/auth/gmail.metadata",

    // Drive
    DRIVE: "https://www.googleapis.com/auth/drive",
    DRIVE_FILE: "https://www.googleapis.com/auth/drive.file",
    DRIVE_READONLY: "https://www.googleapis.com/auth/drive.readonly",
    DRIVE_METADATA_READONLY:
      "https://www.googleapis.com/auth/drive.metadata.readonly",

    // Contacts
    CONTACTS_READONLY: "https://www.googleapis.com/auth/contacts.readonly",
    CONTACTS: "https://www.googleapis.com/auth/contacts",

    // YouTube
    YOUTUBE: "https://www.googleapis.com/auth/youtube",
    YOUTUBE_READONLY: "https://www.googleapis.com/auth/youtube.readonly",

    // Tasks
    TASKS: "https://www.googleapis.com/auth/tasks",
    TASKS_READONLY: "https://www.googleapis.com/auth/tasks.readonly",

    // Sheets
    SPREADSHEETS: "https://www.googleapis.com/auth/spreadsheets",
    SPREADSHEETS_READONLY:
      "https://www.googleapis.com/auth/spreadsheets.readonly",

    // Docs
    DOCUMENTS: "https://www.googleapis.com/auth/documents",
    DOCUMENTS_READONLY: "https://www.googleapis.com/auth/documents.readonly",

    // Forms
    FORMS: "https://www.googleapis.com/auth/forms",
    FORMS_READONLY: "https://www.googleapis.com/auth/forms.readonly",

    // Tasks and reminders
    TASKS_EVENTS: "https://www.googleapis.com/auth/tasks.events",
  };

  clientId: string;
  clientSecret: string;

  private authUri = "https://accounts.google.com/o/oauth2/v2/auth";
  private tokenUri = "https://oauth2.googleapis.com/token";
  private userInfoUri = "https://openidconnect.googleapis.com/v1/userinfo";
  private calendarUri = "";

  private readonly scopes: string[] = [
    GoogleOAuthClient.SCOPES.OPENID,
    GoogleOAuthClient.SCOPES.EMAIL,
    GoogleOAuthClient.SCOPES.PROFILE,
  ];

  constructor({
    clientId,
    clientSecret,
  }: {
    clientId: string;
    clientSecret: string;
  }) {
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth client ID and secret must be provided.");
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  getAuthUrl({
    redirectUri,
    responseType = "code",
    accessType = "offline",
    prompt = "consent",
  }: {
    redirectUri: string;
    responseType?: string;
    accessType?: string;
    prompt?: string;
  }): string {
    if (!redirectUri) throw new Error("Missing redirectUri");
    const scope = this.scopes.join(" ");

    const url = new URL(this.authUri);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", responseType);
    url.searchParams.set("scope", scope);
    url.searchParams.set("access_type", accessType);
    url.searchParams.set("prompt", prompt);

    return url.toString();
  }

  setScopes(scopes: string[] | string) {
    // merge with default scopes
    this.scopes.push(...(isArray(scopes) ? scopes : [scopes]));
  }

  async getToken({
    code,
    redirectUri,
    grantType = "authorization_code",
  }: {
    code: string;
    redirectUri: string;
    grantType?: string;
  }): Promise<GoogleTokenResponse> {
    if (!code) throw new Error("Missing authorization code");

    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: grantType,
    });

    const res = await fetch(this.tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      let errorMessage;
      try {
        const json = await res.json();
        errorMessage = JSON.stringify(json);
      } catch {
        errorMessage = await res.text(); // fallback if not JSON
      }
      throw new Error(`Google token error: ${res.status} - ${errorMessage}`);
    }

    return res.json() as Promise<GoogleTokenResponse>;
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    if (!accessToken) throw new Error("Missing access token");

    const res = await fetch(this.userInfoUri, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      try {
        const json = await res.json();
        return json as Promise<GoogleUserInfo>;
      } catch {
        const text = await res.text();
        throw new Error(`Google user info error: ${res.status} - ${text}`);
      }
    }

    return res.json() as Promise<GoogleUserInfo>;
  }

  async refreshToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const res = await fetch(this.tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google refresh token error: ${res.status} - ${text}`);
    }

    return res.json() as Promise<GoogleTokenResponse>;
  }

  async getCalendarEvents(
    accessToken: string,
    calendarId = "primary",
    timeMin?: string,
    timeMax?: string
  ) {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
    );
    if (timeMin) url.searchParams.set("timeMin", timeMin);
    if (timeMax) url.searchParams.set("timeMax", timeMax);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      try {
        const json = await res.json();
        return json;
      } catch {
        const text = await res.text();
        throw new Error(
          `Google calendar events error: ${res.status} - ${text}`
        );
      }
    }

    return res.json(); // returns events list
  }
}
