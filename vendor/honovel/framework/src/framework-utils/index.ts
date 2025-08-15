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
    Y: "yyyy",
    y: "yy",
    m: "MM",
    n: "M",
    d: "dd",
    j: "d",
    H: "HH",
    h: "hh",
    i: "mm",
    s: "ss",
    A: "a",
    T: "z",
    e: "ZZ",
    o: "yyyy",
    P: "ZZ",
    c: "yyyy-MM-dd'T'HH:mm:ssZZ",
    r: "EEE, dd MMM yyyy HH:mm:ss Z",
    u: "yyyy-MM-dd HH:mm:ss.SSS",
    W: "W",
    N: "E",
    z: "o",
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

  public static createFromTimestamp(
    timestamp: number | null,
    format?: string
  ): Carbon {
    const date = luxonDate.fromMillis(timestamp ?? Carbon.dateNow(), {
      zone: timestamp ? Carbon.defaultTimezone : undefined,
    });
    return new Carbon(date, format);
  }

  public static now(): Carbon {
    const newThis = new this(luxonDate.now().setZone(this.defaultTimezone));
    return newThis;
  }

  public static setCarbonTimezone(timezone: string): void {
    this.defaultTimezone = timezone;
  }

  public addYears(years: number): Carbon {
    const newDate = this.#currentDate.plus({ years });
    return new Carbon(newDate);
  }

  public addMonths(months: number): Carbon {
    const newDate = this.#currentDate.plus({ months });
    return new Carbon(newDate);
  }

  public addDays(days: number): Carbon {
    const newDate = this.#currentDate.plus({ days });
    return new Carbon(newDate);
  }

  public addHours(hours: number): Carbon {
    const newDate = this.#currentDate.plus({ hours });
    return new Carbon(newDate);
  }

  public addMinutes(minutes: number): Carbon {
    const newDate = this.#currentDate.plus({ minutes });
    return new Carbon(newDate);
  }

  public addSeconds(seconds: number): Carbon {
    const newDate = this.#currentDate.plus({ seconds });
    return new Carbon(newDate);
  }

  public addMilliseconds(milliseconds: number): Carbon {
    const newDate = this.#currentDate.plus({ milliseconds });
    return new Carbon(newDate);
  }

  public subYears(years: number): Carbon {
    const newDate = this.#currentDate.minus({ years });
    return new Carbon(newDate);
  }

  public subMonths(months: number): Carbon {
    const newDate = this.#currentDate.minus({ months });
    return new Carbon(newDate);
  }

  public subDays(days: number): Carbon {
    const newDate = this.#currentDate.minus({ days });
    return new Carbon(newDate);
  }

  public subHours(hours: number): Carbon {
    const newDate = this.#currentDate.minus({ hours });
    return new Carbon(newDate);
  }

  public subMinutes(minutes: number): Carbon {
    const newDate = this.#currentDate.minus({ minutes });
    return new Carbon(newDate);
  }

  public subSeconds(seconds: number): Carbon {
    const newDate = this.#currentDate.minus({ seconds });
    return new Carbon(newDate);
  }

  public subMilliseconds(milliseconds: number): Carbon {
    const newDate = this.#currentDate.minus({ milliseconds });
    return new Carbon(newDate);
  }

  public isToday(): boolean {
    return this.#currentDate.hasSame(
      luxonDate.now().setZone(Carbon.defaultTimezone),
      "day"
    );
  }

  public isTomorrow(): boolean {
    const tomorrow = luxonDate
      .now()
      .setZone(Carbon.defaultTimezone)
      .plus({ days: 1 });
    return this.#currentDate.hasSame(tomorrow, "day");
  }

  public isYesterday(): boolean {
    const yesterday = luxonDate
      .now()
      .setZone(Carbon.defaultTimezone)
      .minus({ days: 1 });
    return this.#currentDate.hasSame(yesterday, "day");
  }

  public startOfDay(): Carbon {
    return new Carbon(this.#currentDate.startOf("day"));
  }

  public endOfDay(): Carbon {
    return new Carbon(this.#currentDate.endOf("day"));
  }

  public toDateString(): string {
    return this.#currentDate.toFormat("yyyy-MM-dd");
  }

  public toTimeString(): string {
    return this.#currentDate.toFormat("HH:mm:ss");
  }

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

  public static today(): Carbon {
    const todayDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .startOf("day");
    return new this(todayDate);
  }

  public static tomorrow(): Carbon {
    const tomorrowDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .plus({ days: 1 })
      .startOf("day");
    return new this(tomorrowDate);
  }

  public static yesterday(): Carbon {
    const yesterdayDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .minus({ days: 1 })
      .startOf("day");
    return new this(yesterdayDate);
  }

  public static parse(dateString: string, format?: string): Carbon {
    const fmt = format || this.defaultFormat;
    const date = luxonDate.fromFormat(dateString, fmt, {
      zone: this.defaultTimezone,
    });
    return new this(date);
  }

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

  public static min(...dates: Carbon[]): Carbon {
    const minDate = dates.reduce((min, current) =>
      current.#currentDate < min.#currentDate ? current : min
    );
    return new this(minDate.#currentDate);
  }

  public static max(...dates: Carbon[]): Carbon {
    const maxDate = dates.reduce((max, current) =>
      current.#currentDate > max.#currentDate ? current : max
    );
    return new this(maxDate.#currentDate);
  }

  public static make(dateInput?: string | number | Date): Carbon | null {
    if (!dateInput) return null;
    const date = luxonDate.fromJSDate(new Date(dateInput));
    return new this(date.setZone(this.defaultTimezone));
  }
}
