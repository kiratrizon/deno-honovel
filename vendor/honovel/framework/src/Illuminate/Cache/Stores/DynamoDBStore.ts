import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";
import { CacheDriver } from "configs/@types/index.d.ts";

export default class DynamoDBStore extends AbstractStore {
  private client: any;
  private readonly table: string;
  private readonly partitionKey: string;
  private DynamoDBClient: any;
  private PutItemCommand: any;
  private CreateTableCommand: any;
  private DescribeTableCommand: any;
  private GetItemCommand: any;
  private DeleteItemCommand: any;
  private ScanCommand: any;
  private BatchWriteItemCommand: any;

  constructor(
    driver: CacheDriver,
    opts: {
      key?: string;
      secret?: string;
      region?: string;
      table?: string;
      prefix?: string;
      partitionKey?: string;
    } = {},
  ) {
    super(opts.prefix);
    const { key, secret, region, table, prefix, partitionKey } = opts;
    if (!isset(key) || !isset(secret) || !isset(region)) {
      throw new Error("DynamoDBStore requires valid key, secret, and region.");
    }
    if (!isset(table) || !isString(table)) {
      throw new Error("DynamoDBStore requires a valid table name.");
    }

    if (driver !== "dynamodb") {
      throw new Error(`Unsupported cache driver for DynamoDB: ${driver}`);
    }
    if (!isset(partitionKey) || !isString(partitionKey)) {
      throw new Error("DynamoDBStore requires a valid partition key.");
    }
    this.partitionKey = partitionKey;
    this.prefix = prefix || config("cache").prefix || "";
    this.table = table;

    // Store credentials for later use
    this._key = key;
    this._secret = secret;
    this._region = region;
  }

  private _key: string;
  private _secret: string;
  private _region: string;

  #initialized = false;
  public async init() {
    if (this.#initialized) return; // Already initialized

    // Dynamically load AWS SDK to avoid bloatware
    try {
      const awsSdk = await import("@aws-sdk/client-dynamodb");
      this.DynamoDBClient = awsSdk.DynamoDBClient;
      this.PutItemCommand = awsSdk.PutItemCommand;
      this.CreateTableCommand = awsSdk.CreateTableCommand;
      this.DescribeTableCommand = awsSdk.DescribeTableCommand;
      this.GetItemCommand = awsSdk.GetItemCommand;
      this.DeleteItemCommand = awsSdk.DeleteItemCommand;
      this.ScanCommand = awsSdk.ScanCommand;
      this.BatchWriteItemCommand = awsSdk.BatchWriteItemCommand;

      this.client = new this.DynamoDBClient({
        region: this._region,
        credentials: {
          accessKeyId: this._key,
          secretAccessKey: this._secret,
        },
      });
    } catch (_error) {
      console.error(
        "Failed to load @aws-sdk/client-dynamodb. Please install it using:",
      );
      console.error("  deno task install:driver --cache dynamodb");
      throw new Error(
        "DynamoDBStore requires @aws-sdk/client-dynamodb to be installed.",
      );
    }

    try {
      await this.client.send(
        new this.DescribeTableCommand({ TableName: this.table }),
      );
      this.#initialized = true; // Mark as initialized
      return;
    } catch (error) {
      if ((error as Error).name !== "ResourceNotFoundException") {
        throw error; // Re-throw if it's not a "table doesn't exist" error
      }
    }
    const command = new this.CreateTableCommand({
      TableName: this.table,
      KeySchema: [
        {
          AttributeName: this.partitionKey,
          KeyType: "HASH", // Partition key
        },
      ],
      BillingMode: "PAY_PER_REQUEST", // On-demand billing
      AttributeDefinitions: [
        {
          AttributeName: this.partitionKey,
          AttributeType: "S", // String type
        },
      ],
    });

    try {
      await this.client.send(command);
      this.#initialized = true; // Mark as initialized
    } catch (error) {
      console.error(`Error creating table "${this.table}":`, error);
      throw error; // Re-throw the error if table creation fails
    }
  }

  public async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);

    try {
      const result = await this.client.send(
        new this.GetItemCommand({
          TableName: this.table,
          Key: {
            [this.partitionKey]: { S: newKey },
          },
        }),
      );

      if (!result.Item || !result.Item.name || !result.Item.name.S) return null;
      const data = jsonDecode(result.Item.name.S || "{}");
      if (keyExist(data, "expiresAt")) {
        const expiresAt = data.expiresAt as string | null;
        if (isNull(expiresAt)) {
          return data.value; // No expiration, return value
        } else {
          if (!isString(expiresAt)) {
            return null; // Invalid expiration format
          } else {
            const expiresAtTime = strToTime(expiresAt);
            if (expiresAtTime && time() > expiresAtTime) {
              // Item has expired
              await this.forget(newKey); // Optionally remove expired item
              return null;
            }
            return data.value; // Return the cached value
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error getting key "${newKey}":`, error);
      return null;
    }
  }

  public async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;

    const data = {
      value: value,
      expiresAt,
    };

    try {
      await this.client.send(
        new this.PutItemCommand({
          TableName: this.table,
          Item: {
            [this.partitionKey]: { S: newKey },
            name: { S: jsonEncode(data) },
          },
        }),
      );
    } catch (error) {
      console.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.send(
        new this.DeleteItemCommand({
          TableName: this.table,
          Key: {
            [this.partitionKey]: { S: newKey },
          },
        }),
      );
    } catch (error) {
      console.error(`Error deleting key "${newKey}":`, error);
    }
  }

  // control flush all items in the cache
  public async flush(): Promise<void> {
    await this.init();
    try {
      const scanCommand = new this.ScanCommand({
        TableName: this.table,
      });
      const items = await this.client.send(scanCommand);

      if (items.Items && items.Items.length > 0) {
        const keysToDelete = items.Items.map((item: any) => ({
          [this.partitionKey]: item[this.partitionKey],
        }));

        // Batch in chunks of 25
        for (let i = 0; i < keysToDelete.length; i += 25) {
          const chunk = keysToDelete.slice(i, i + 25);

          const batchWriteCommand = new this.BatchWriteItemCommand({
            RequestItems: {
              [this.table]: chunk.map((key: any) => ({
                DeleteRequest: { Key: key },
              })),
            },
          });

          await this.client.send(batchWriteCommand);
        }
      }
    } catch (error) {
      console.error("Error flushing DynamoDB store:", error);
    }
  }
  getPrefix(): string {
    return this.prefix;
  }
}
