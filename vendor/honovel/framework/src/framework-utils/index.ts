import { DateTime as luxonDate } from "luxon";

type timeValue =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "months"
  | "years"
  | "milliseconds";
export class Carbon extends String {
  private static defaultTimezone: string = "UTC";
  private static defaultFormat: string = "yyyy-MM-dd HH:mm:ss";

  private static formatMapping: Record<string, string> = {
    // Year
    Y: "yyyy",
    y: "yy",
    o: "kkkk",   // ISO-8601 week-numbering year
    // Month
    F: "MMMM",   // Full month name (January)
    M: "MMM",    // Abbreviated month name (Jan)
    m: "MM",     // Month with leading zero (01–12)
    n: "M",      // Month without leading zero (1–12)
    // Day
    d: "dd",     // Day with leading zero (01–31)
    j: "d",      // Day without leading zero (1–31)
    D: "ccc",    // Abbreviated day name (Mon)
    l: "cccc",   // Full day name (Monday)
    N: "E",      // ISO day of week (1=Mon, 7=Sun)
    z: "o",      // Day of year (1–366)
    // Week
    W: "W",      // ISO week number
    // Hour
    H: "HH",    // 24h with leading zero (00–23)
    G: "H",     // 24h without leading zero (0–23)
    h: "hh",    // 12h with leading zero (01–12)
    g: "h",     // 12h without leading zero (1–12)
    // Minute / Second / Sub-second
    i: "mm",    // Minutes with leading zero
    s: "ss",    // Seconds with leading zero
    v: "SSS",   // Milliseconds
    u: "SSS",   // Microseconds (closest approximation: milliseconds)
    // AM/PM
    A: "a",     // Uppercase AM/PM
    a: "a",     // Lowercase am/pm (Luxon outputs uppercase; closest available)
    // Timezone
    T: "z",     // Timezone abbreviation
    e: "ZZ",    // Timezone identifier
    O: "ZZZ",   // GMT offset without colon (+0200)
    P: "ZZ",    // GMT offset with colon (+02:00)
    // Full formats
    c: "yyyy-MM-dd'T'HH:mm:ssZZ",        // ISO 8601
    r: "EEE, dd MMM yyyy HH:mm:ss Z",    // RFC 2822
  };

  #currentDate: luxonDate;
  constructor(date: luxonDate, format?: string) {
    const formatting = format
      ? Carbon.formatMapper(format)
      : Carbon.defaultFormat;
    const formattedData = date.toFormat(formatting);
    super(formattedData);
    this.#currentDate = date;
  }

  private static dateNow() {
    const timeNow = new Date().toLocaleString("en-US", {
      timeZone: Carbon.defaultTimezone || "UTC",
    });
    const unixTimestamp = Math.floor(new Date(timeNow).getTime());
    return unixTimestamp;
  }

  private static formatMapper(format: string): string {
    if (!format) {
      return this.defaultFormat;
    }
    return format
      .split("")
      .map((char) => this.formatMapping[char] || char)
      .join("");
  }

  /** Creates a Carbon instance from a Unix millisecond timestamp. Optionally formats the string representation using PHP-style format characters. */
  public static createFromTimestamp(
    timestamp: number | null,
    format?: string
  ): Carbon {
    const date = luxonDate.fromMillis(timestamp ?? Carbon.dateNow(), {
      zone: timestamp ? Carbon.defaultTimezone : undefined,
    });
    return new Carbon(date, format);
  }

  /** Returns a Carbon instance representing the current date and time in the configured timezone. */
  public static now(): Carbon {
    const newThis = new this(luxonDate.now().setZone(this.defaultTimezone));
    return newThis;
  }

  /** Sets the default timezone used by all Carbon instances for date/time calculations and formatting. */
  public static setCarbonTimezone(timezone: string): void {
    this.defaultTimezone = timezone;
  }

  /** Returns a new Carbon instance with the given number of years added. */
  public addYears(years: number): Carbon {
    const newDate = this.#currentDate.plus({ years });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of months added. */
  public addMonths(months: number): Carbon {
    const newDate = this.#currentDate.plus({ months });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of days added. */
  public addDays(days: number): Carbon {
    const newDate = this.#currentDate.plus({ days });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of hours added. */
  public addHours(hours: number): Carbon {
    const newDate = this.#currentDate.plus({ hours });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of minutes added. */
  public addMinutes(minutes: number): Carbon {
    const newDate = this.#currentDate.plus({ minutes });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of seconds added. */
  public addSeconds(seconds: number): Carbon {
    const newDate = this.#currentDate.plus({ seconds });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of milliseconds added. */
  public addMilliseconds(milliseconds: number): Carbon {
    const newDate = this.#currentDate.plus({ milliseconds });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of weeks added. */
  public addWeeks(weeks: number): Carbon {
    const newDate = this.#currentDate.plus({ weeks });
    return new Carbon(newDate);
  }

  /** Returns the ISO weekday of this instance (1=Monday..7=Sunday). */
  public weekday(): number {
    return this.#currentDate.weekday;
  }

  /** Returns the four-digit year of this instance. */
  public year(): number {
    return this.#currentDate.year;
  }

  /** Returns the month of this instance (1-12). */
  public month(): number {
    return this.#currentDate.month;
  }

  /** Returns the day of the month of this instance (1-31). */
  public day(): number {
    return this.#currentDate.day;
  }

  /** Returns the number of days in this instance's month (28-31). */
  public daysInMonth(): number {
    return this.#currentDate.daysInMonth as number;
  }

  /** Returns a new Carbon instance with the given number of years subtracted. */
  public subYears(years: number): Carbon {
    const newDate = this.#currentDate.minus({ years });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of months subtracted. */
  public subMonths(months: number): Carbon {
    const newDate = this.#currentDate.minus({ months });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of days subtracted. */
  public subDays(days: number): Carbon {
    const newDate = this.#currentDate.minus({ days });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of hours subtracted. */
  public subHours(hours: number): Carbon {
    const newDate = this.#currentDate.minus({ hours });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of minutes subtracted. */
  public subMinutes(minutes: number): Carbon {
    const newDate = this.#currentDate.minus({ minutes });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of seconds subtracted. */
  public subSeconds(seconds: number): Carbon {
    const newDate = this.#currentDate.minus({ seconds });
    return new Carbon(newDate);
  }

  /** Returns a new Carbon instance with the given number of milliseconds subtracted. */
  public subMilliseconds(milliseconds: number): Carbon {
    const newDate = this.#currentDate.minus({ milliseconds });
    return new Carbon(newDate);
  }

  /** Returns true if this instance falls on the current calendar day in the configured timezone. */
  public isToday(): boolean {
    return this.#currentDate.hasSame(
      luxonDate.now().setZone(Carbon.defaultTimezone),
      "day"
    );
  }

  /** Returns true if this instance falls on tomorrow's calendar day in the configured timezone. */
  public isTomorrow(): boolean {
    const tomorrow = luxonDate
      .now()
      .setZone(Carbon.defaultTimezone)
      .plus({ days: 1 });
    return this.#currentDate.hasSame(tomorrow, "day");
  }

  /** Returns true if this instance falls on yesterday's calendar day in the configured timezone. */
  public isYesterday(): boolean {
    const yesterday = luxonDate
      .now()
      .setZone(Carbon.defaultTimezone)
      .minus({ days: 1 });
    return this.#currentDate.hasSame(yesterday, "day");
  }

  /** Returns a new Carbon instance set to midnight (00:00:00) of the same day. */
  public startOfDay(): Carbon {
    return new Carbon(this.#currentDate.startOf("day"));
  }

  /** Returns a new Carbon instance set to the last millisecond (23:59:59.999) of the same day. */
  public endOfDay(): Carbon {
    return new Carbon(this.#currentDate.endOf("day"));
  }

  /** Returns the date portion as a string in `yyyy-MM-dd` format (e.g. `2026-06-30`). */
  public toDateString(): string {
    return this.#currentDate.toFormat("yyyy-MM-dd");
  }

  /** Returns the time portion as a string in `HH:mm:ss` format (e.g. `14:05:30`). */
  public toTimeString(): string {
    return this.#currentDate.toFormat("HH:mm:ss");
  }

  /** Converts the datetime to a numeric value in the given unit (e.g. `"seconds"`, `"days"`, `"milliseconds"`) since the Unix epoch. Floors the result by default; pass `false` to get a fractional value. */
  public to(toTime: timeValue, floored: boolean = true): number {
    let convertedTime: number;
    switch (toTime) {
      case "seconds": {
        convertedTime = this.#currentDate.toSeconds(); // Returns seconds since epoch
        break;
      }
      case "minutes": {
        convertedTime = this.#currentDate.toMinutes(); // Returns minutes since epoch
        break;
      }
      case "hours": {
        convertedTime = this.#currentDate.toHours(); // Returns hours since epoch
        break;
      }
      case "days": {
        convertedTime = this.#currentDate.toDays(); // Returns days since epoch
        break;
      }
      case "months": {
        convertedTime = this.#currentDate.toMonths(); // Returns months since epoch
        break;
      }
      case "years": {
        convertedTime = this.#currentDate.toYears(); // Returns years since epoch
        break;
      }
      case "milliseconds": {
        convertedTime = this.#currentDate.toMillis(); // Returns milliseconds since epoch
        break;
      }
      default: {
        throw new Error(`Unsupported time value: ${toTime}`);
      }
    }
    return floored ? Math.floor(convertedTime) : convertedTime;
  }

  /** Returns a Carbon instance set to midnight of the current day in the configured timezone. */
  public static today(): Carbon {
    const todayDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .startOf("day");
    return new this(todayDate);
  }

  /** Returns a Carbon instance set to midnight of tomorrow in the configured timezone. */
  public static tomorrow(): Carbon {
    const tomorrowDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .plus({ days: 1 })
      .startOf("day");
    return new this(tomorrowDate);
  }

  /** Returns a Carbon instance set to midnight of yesterday in the configured timezone. */
  public static yesterday(): Carbon {
    const yesterdayDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .minus({ days: 1 })
      .startOf("day");
    return new this(yesterdayDate);
  }

  /** Parses a date string using Luxon format tokens (or the class default format) and returns a Carbon instance in the configured timezone. */
  public static parse(dateString: string, format?: string): Carbon {
    const fmt = format || this.defaultFormat;
    const date = luxonDate.fromFormat(dateString, fmt, {
      zone: this.defaultTimezone,
    });
    return new this(date);
  }

  /** Creates a Carbon instance from explicit date/time components. Unspecified components default to the start of their period (month=1, day=1, hour/minute/second=0). */
  public static create(
    year: number,
    month: number = 1,
    day: number = 1,
    hour: number = 0,
    minute: number = 0,
    second: number = 0
  ): Carbon {
    const date = luxonDate.fromObject(
      { year, month, day, hour, minute, second },
      { zone: this.defaultTimezone }
    );
    return new this(date);
  }

  /** Returns the earliest Carbon instance from the provided list. */
  public static min(...dates: Carbon[]): Carbon {
    const minDate = dates.reduce((min, current) =>
      current.#currentDate < min.#currentDate ? current : min
    );
    return new this(minDate.#currentDate);
  }

  /** Returns the latest Carbon instance from the provided list. */
  public static max(...dates: Carbon[]): Carbon {
    const maxDate = dates.reduce((max, current) =>
      current.#currentDate > max.#currentDate ? current : max
    );
    return new this(maxDate.#currentDate);
  }

  /** Creates a Carbon instance from a string, Unix timestamp number, or JS Date object. Returns null if no input is provided. */
  public static make(dateInput?: string | number | Date): Carbon | null {
    if (!dateInput) return null;
    const date = luxonDate.fromJSDate(new Date(dateInput));
    return new this(date.setZone(this.defaultTimezone));
  }
}
