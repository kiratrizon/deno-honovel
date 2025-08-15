import { faker as baseFaker, type Faker as FakerType } from "@faker-js/faker";

export class FakerFactory {
  // @ts-ignore //
  private faker: FakerType;

  public static create() {
    const instance = new FakerFactory(baseFaker);
    return instance;
  }

  constructor(faker: FakerType) {
    if (!faker) {
      throw new Error("Faker instance is required");
    }
    this.faker = faker;
  }

  /**
   * Laravel-like proxy for accessing the original faker instance.
   * @param key Property name from the Faker object
   */
  public __get<K extends keyof FakerType>(key: K) {
    return this.faker[key];
  }

  // -------------------
  // People
  // -------------------

  /** @returns A random full name */
  public name(): string {
    return this.faker.person.fullName();
  }

  /** @returns A random first name */
  public firstName(): string {
    return this.faker.person.firstName();
  }

  /** @returns A random last name */
  public lastName(): string {
    return this.faker.person.lastName();
  }

  /** @returns A random username */
  public username(): string {
    return this.faker.internet.userName();
  }

  /** @returns A random email address */
  public email(): string {
    return this.faker.internet.email();
  }

  /**
   * @param length Password length (default 10)
   * @returns A random password string
   */
  public password(length: number = 10): string {
    return this.faker.internet.password({ length });
  }

  /** @returns A random phone number */
  public phoneNumber(): string {
    return this.faker.phone.number();
  }

  // -------------------
  // Addresses
  // -------------------

  /** @returns A random street address */
  public address(): string {
    return this.faker.location.streetAddress();
  }

  /** @returns A random city name */
  public city(): string {
    return this.faker.location.city();
  }

  /** @returns A random state/province name */
  public state(): string {
    return this.faker.location.state();
  }

  /** @returns A random country name */
  public country(): string {
    return this.faker.location.country();
  }

  /** @returns A random postal/ZIP code */
  public postcode(): string {
    return this.faker.location.zipCode();
  }

  // -------------------
  // Dates
  // -------------------

  /** @returns A random date and time */
  public date(): Date {
    return this.faker.date.anytime();
  }

  /**
   * @param start Start date (Date or string)
   * @param end End date (Date or string)
   * @returns A random date between the given range
   */
  public dateTimeBetween(start: Date | string, end: Date | string): Date {
    return this.faker.date.between({ from: start, to: end });
  }

  /**
   * @param years Number of years back (default 1)
   * @returns A random past date
   */
  public past(years: number = 1): Date {
    return this.faker.date.past({ years });
  }

  /**
   * @param years Number of years forward (default 1)
   * @returns A random future date
   */
  public future(years: number = 1): Date {
    return this.faker.date.future({ years });
  }

  // -------------------
  // Numbers
  // -------------------

  /**
   * @param min Minimum value
   * @param max Maximum value
   * @returns A random integer between min and max
   */
  public numberBetween(min: number, max: number): number {
    return this.faker.number.int({ min, max });
  }

  /**
   * @param min Minimum value
   * @param max Maximum value
   * @param precision Decimal places (default 2)
   * @returns A random float between min and max
   */
  public randomFloat(min: number, max: number, precision: number = 2): number {
    return parseFloat(
      this.faker.number
        .float({ min, max, fractionDigits: precision })
        .toFixed(precision)
    );
  }

  /** @returns A random digit from 0 to 9 */
  public randomDigit(): number {
    return this.faker.number.int({ min: 0, max: 9 });
  }

  /** @returns A random digit from 1 to 9 (non-zero) */
  public randomDigitNotZero(): number {
    return this.faker.number.int({ min: 1, max: 9 });
  }

  // -------------------
  // Text
  // -------------------

  /** @returns A single random word */
  public word(): string {
    return this.faker.lorem.word();
  }

  /**
   * @param words Number of words (default 6)
   * @returns A random sentence
   */
  public sentence(words: number = 6): string {
    return this.faker.lorem.sentence(words);
  }

  /**
   * @param sentences Number of sentences (default 3)
   * @returns A random paragraph
   */
  public paragraph(sentences: number = 3): string {
    return this.faker.lorem.paragraph(sentences);
  }

  /**
   * @param maxLength Maximum character length (default 200)
   * @returns Random lorem text up to the specified length
   */
  public text(maxLength: number = 200): string {
    return this.faker.lorem.text().slice(0, maxLength);
  }

  /**
   * @param words Number of words (default 3)
   * @returns A random slug (e.g., "my-sample-title")
   */
  public slug(words: number = 3): string {
    return this.faker.lorem.slug(words);
  }

  // -------------------
  // Internet
  // -------------------

  /** @returns A random URL */
  public url(): string {
    return this.faker.internet.url();
  }

  /** @returns A random IPv4 address */
  public ipv4(): string {
    return this.faker.internet.ipv4();
  }

  /** @returns A random IPv6 address */
  public ipv6(): string {
    return this.faker.internet.ipv6();
  }

  /** @returns A random MAC address */
  public macAddress(): string {
    return this.faker.internet.mac();
  }

  /** @returns A random UUID v4 string */
  public uuid(): string {
    return this.faker.string.uuid();
  }

  // -------------------
  // Miscellaneous
  // -------------------

  /** @returns A random boolean value */
  public boolean(): boolean {
    return this.faker.datatype.boolean();
  }

  /**
   * @param array Array of elements
   * @returns A random element from the given array
   */
  public randomElement<T>(array: T[]): T {
    return this.faker.helpers.arrayElement(array);
  }

  /**
   * @param array Array of elements
   * @returns The array with elements randomly shuffled
   */
  public shuffleArray<T>(array: T[]): T[] {
    return this.faker.helpers.shuffle(array);
  }

  /** @returns A random human-readable color name */
  public color(): string {
    return this.faker.color.human();
  }
}
