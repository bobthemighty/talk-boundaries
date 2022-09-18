import { Cart, EMPTY } from "./cart";
import {
  DynamoDBClient,
  PutItemCommand,
  TransactWriteItemsCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

/*
 * This module implements a basic repository pattern
 * for our cart aggregate. Practically, I would usually
 * have a Repository class rather than a module because it's
 * easier to inject for testing purposes.
 *
 * I'd also _not_ build all the Commands myself, it's easier
 * to use a library, eg. https://github.com/jeremydaly/dynamodb-toolbox
 * but doing it all by hand makes it easier to understand exactly
 * what's going on.
 *
 * The module exposes a `serialize` function that creates us a
 * command for DynamoDB. This makes it easy to test what we're
 * going to send to our database without needing to run dynamo in
 * the cloud or in a docker container
 *
 * Note that there's no error handling of any kind, or logging or
 * any of the other things you need to have for an actual operational
 * system.
 * Please don't put this in production and blame me :)
 */

// This function returns the payload we use when creating a new
// cart. We'll either use this from a PutItems command or TransactWriteItems
// command depending on whether the cart is empty.
const insertEmpty = (cart) => ({
  TableName: "shopping-cart",
  Item: {
    pk: { S: `cart-${cart.id}` },
    sk: { S: "__cart" },
    version: { N: "0" },
  },
  ConditionExpression: "attribute_not_exists(pk)",
});

// This function creates the payload for changed items in the cart
const putItems = (cart) =>
  cart.changedItems.map((item) => ({
    Put: {
      TableName: "shopping-cart",
      Item: {
        pk: { S: `cart-${cart.id}` },
        sk: { S: item.sku },
        price: { N: item.price.toString() },
        qty: { N: item.qty.toString() },
      },
    },
  }));

// This function returns the payload for an UpdateExpression
// if we're modifying an existing cart.
const update = (cart) => ({
  Update: {
    TableName: "shopping-cart",
    Key: {
      pk: { S: `cart-${cart.id}` },
      sk: { S: "__cart" },
    },
    UpdateExpression: "ADD version :inc",
    ConditionExpression: "version = :prev",
    ExpressionAttributeValues: {
      ":inc": { N: "1" },
      ":prev": { N: cart.version.toString() },
    },
  },
});

// This function returns either a PutItems or TransactWriteItems
// Command that we can send to DynamoDB.
export function serialize(cart) {
  if (cart.version === EMPTY && cart.changedItems.length === 0)
    return new PutItemCommand(insertEmpty(cart));

  return new TransactWriteItemsCommand({
    TransactItems: [
      cart.version === EMPTY ? { Put: insertEmpty(cart) } : update(cart),
      ...putItems(cart),
    ],
  });
}

// This function takes the response object from a DynamoDB Query
// and turns it into a cart.
export function deserialize(response) {
  const id = response.Items[0].pk.S.substr(5);
  const items = response.Items.filter((item) => item.sk.S !== "__cart").map(
    (item) => ({
      sku: item.sk.S,
      qty: parseInt(item.qty.N),
      price: parseInt(item.price.N),
    })
  );

  const parent = response.Items.find((item) => item.sk.S === "__cart");

  return new Cart(id, parseInt(parent.version.N), items);
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

async function put(cart) {
  const cmd = serialize(cart);
  await client.send(serialize(cart));
}

async function get(cartId) {
  const response = await client.send(
    new QueryCommand({
      TableName: "shopping-cart",
      KeyConditionExpression: "pk = :cartId",
      ExpressionAttributeValues: {
        ":cartId": { S: `cart-${cartId}` },
      },
    })
  );
  return deserialize(response);
}

export default {
  put,
  get,
};
