export function staticImplements<T>() {
  return <U extends T>(constructor: U) => {
    constructor;
  };
}

import { DateTime as luxonDate } from "luxon";
class ACarbon extends String {
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
      ? ACarbon.formatMapper(format)
      : ACarbon.defaultFormat;
    const formattedData = date.toFormat(formatting);
    super(formattedData);
    this.#currentDate = date;
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
  ): ACarbon {
    const date = luxonDate.fromMillis(timestamp ?? Date.now(), {
      zone: this.defaultTimezone,
    });
    return new ACarbon(date, format);
  }

  public static now(): ACarbon {
    const newThis = new this(luxonDate.now().setZone(this.defaultTimezone));
    return newThis;
  }

  public static setCarbonTimezone(timezone: string): void {
    this.defaultTimezone = timezone;
  }

  public addYears(years: number): ACarbon {
    const newDate = this.#currentDate.plus({ years });
    return new ACarbon(newDate);
  }

  public addMonths(months: number): ACarbon {
    const newDate = this.#currentDate.plus({ months });
    return new ACarbon(newDate);
  }

  public addDays(days: number): ACarbon {
    const newDate = this.#currentDate.plus({ days });
    return new ACarbon(newDate);
  }

  public addHours(hours: number): ACarbon {
    const newDate = this.#currentDate.plus({ hours });
    return new ACarbon(newDate);
  }

  public addMinutes(minutes: number): ACarbon {
    const newDate = this.#currentDate.plus({ minutes });
    return new ACarbon(newDate);
  }

  public addSeconds(seconds: number): ACarbon {
    const newDate = this.#currentDate.plus({ seconds });
    return new ACarbon(newDate);
  }

  public addMilliseconds(milliseconds: number): ACarbon {
    const newDate = this.#currentDate.plus({ milliseconds });
    return new ACarbon(newDate);
  }

  public subYears(years: number): ACarbon {
    const newDate = this.#currentDate.minus({ years });
    return new ACarbon(newDate);
  }

  public subMonths(months: number): ACarbon {
    const newDate = this.#currentDate.minus({ months });
    return new ACarbon(newDate);
  }

  public subDays(days: number): ACarbon {
    const newDate = this.#currentDate.minus({ days });
    return new ACarbon(newDate);
  }

  public subHours(hours: number): ACarbon {
    const newDate = this.#currentDate.minus({ hours });
    return new ACarbon(newDate);
  }

  public subMinutes(minutes: number): ACarbon {
    const newDate = this.#currentDate.minus({ minutes });
    return new ACarbon(newDate);
  }

  public subSeconds(seconds: number): ACarbon {
    const newDate = this.#currentDate.minus({ seconds });
    return new ACarbon(newDate);
  }

  public subMilliseconds(milliseconds: number): ACarbon {
    const newDate = this.#currentDate.minus({ milliseconds });
    return new ACarbon(newDate);
  }

  public isToday(): boolean {
    return this.#currentDate.hasSame(
      luxonDate.now().setZone(ACarbon.defaultTimezone),
      "day"
    );
  }

  public isTomorrow(): boolean {
    const tomorrow = luxonDate
      .now()
      .setZone(ACarbon.defaultTimezone)
      .plus({ days: 1 });
    return this.#currentDate.hasSame(tomorrow, "day");
  }

  public isYesterday(): boolean {
    const yesterday = luxonDate
      .now()
      .setZone(ACarbon.defaultTimezone)
      .minus({ days: 1 });
    return this.#currentDate.hasSame(yesterday, "day");
  }

  public startOfDay(): ACarbon {
    return new ACarbon(this.#currentDate.startOf("day"));
  }

  public endOfDay(): ACarbon {
    return new ACarbon(this.#currentDate.endOf("day"));
  }

  public toDateString(): string {
    return this.#currentDate.toFormat("yyyy-MM-dd");
  }

  public toTimeString(): string {
    return this.#currentDate.toFormat("HH:mm:ss");
  }

  public static today(): ACarbon {
    const todayDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .startOf("day");
    return new this(todayDate);
  }

  public static tomorrow(): ACarbon {
    const tomorrowDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .plus({ days: 1 })
      .startOf("day");
    return new this(tomorrowDate);
  }

  public static yesterday(): ACarbon {
    const yesterdayDate = luxonDate
      .now()
      .setZone(this.defaultTimezone)
      .minus({ days: 1 })
      .startOf("day");
    return new this(yesterdayDate);
  }

  public static parse(dateString: string, format?: string): ACarbon {
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
  ): ACarbon {
    const date = luxonDate.fromObject(
      { year, month, day, hour, minute, second },
      { zone: this.defaultTimezone }
    );
    return new this(date);
  }

  public static min(...dates: ACarbon[]): ACarbon {
    const minDate = dates.reduce((min, current) =>
      current.#currentDate < min.#currentDate ? current : min
    );
    return new this(minDate.#currentDate);
  }

  public static max(...dates: ACarbon[]): ACarbon {
    const maxDate = dates.reduce((max, current) =>
      current.#currentDate > max.#currentDate ? current : max
    );
    return new this(maxDate.#currentDate);
  }

  public static make(dateInput?: string | number | Date): ACarbon | null {
    if (!dateInput) return null;
    const date = luxonDate.fromJSDate(new Date(dateInput));
    return new this(date.setZone(this.defaultTimezone));
  }
}

/**
 * Carbon is a date-time helper class inspired by Laravel's Carbon.
 * It wraps Luxon for date manipulation with a Laravel-like API.
 */
declare class ICarbon extends String {
  /** Default timezone for all Carbon instances */
  private static defaultTimezone: string;

  /** Default date-time format used when no format is provided */
  private static defaultFormat: string;

  /** Map PHP date formats to Luxon formats */
  private static formatMapping: Record<string, string>;

  /** Internal Luxon date instance */
  readonly #currentDate: luxonDate;

  /** Create a Carbon instance from a Luxon DateTime */
  constructor(date: luxonDate, format?: string);

  /** Format mapper for converting PHP-style formats to Luxon formats */
  private static formatMapper(format: string): string;

  /** Create a Carbon instance from a Unix timestamp */
  static createFromTimestamp(
    timestamp: number | null,
    format?: string
  ): ICarbon;

  /** Get the current date and time as a Carbon instance */
  static now(): ICarbon;

  /** Set the global timezone used by Carbon */
  static setCarbonTimezone(timezone: string): void;

  /** Add years to the current Carbon instance */
  addYears(years: number): ICarbon;

  /** Add months to the current Carbon instance */
  addMonths(months: number): ICarbon;

  /** Add days to the current Carbon instance */
  addDays(days: number): ICarbon;

  /** Add hours to the current Carbon instance */
  addHours(hours: number): ICarbon;

  /** Add minutes to the current Carbon instance */
  addMinutes(minutes: number): ICarbon;

  /** Add seconds to the current Carbon instance */
  addSeconds(seconds: number): ICarbon;

  /** Add milliseconds to the current Carbon instance */
  addMilliseconds(milliseconds: number): ICarbon;

  /** Subtract years from the current Carbon instance */
  subYears(years: number): ICarbon;

  /** Subtract months from the current Carbon instance */
  subMonths(months: number): ICarbon;

  /** Subtract days from the current Carbon instance */
  subDays(days: number): ICarbon;

  /** Subtract hours from the current Carbon instance */
  subHours(hours: number): ICarbon;

  /** Subtract minutes from the current Carbon instance */
  subMinutes(minutes: number): ICarbon;

  /** Subtract seconds from the current Carbon instance */
  subSeconds(seconds: number): ICarbon;

  /** Subtract milliseconds from the current Carbon instance */
  subMilliseconds(milliseconds: number): ICarbon;

  /** Check if the Carbon date is today */
  isToday(): boolean;

  /** Check if the Carbon date is tomorrow */
  isTomorrow(): boolean;

  /** Check if the Carbon date is yesterday */
  isYesterday(): boolean;

  /** Get the start of the day as a new ACarbon instance */
  startOfDay(): ICarbon;

  /** Get the end of the day as a new ACarbon instance */
  endOfDay(): ICarbon;

  /** Format the date as a string (yyyy-MM-dd) */
  toDateString(): string;

  /** Format the time as a string (HH:mm:ss) */
  toTimeString(): string;

  /** Get today's date as a Carbon instance */
  static today(): ICarbon;

  /** Get tomorrow's date as a Carbon instance */
  static tomorrow(): ICarbon;

  /** Get yesterday's date as a Carbon instance */
  static yesterday(): ICarbon;

  /** Parse a date string into a Carbon instance using optional format */
  static parse(dateString: string, format?: string): ICarbon;

  /** Create a Carbon instance from year, month, day, hour, minute, second */
  static create(
    year: number,
    month?: number,
    day?: number,
    hour?: number,
    minute?: number,
    second?: number
  ): ICarbon;

  /** Get the minimum (earliest) Carbon instance among provided dates */
  static min(...dates: ICarbon[]): ICarbon;

  /** Get the maximum (latest) Carbon instance among provided dates */
  static max(...dates: ICarbon[]): ICarbon;

  /** Create a Carbon instance from a string, number, or Date object */
  static make(dateInput?: string | number | Date): ICarbon | null;
}

const Carbon: typeof ICarbon = ACarbon as unknown as typeof ICarbon;
export { Carbon };
