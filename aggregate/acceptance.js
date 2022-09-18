import { strict as assert } from "node:assert";
import { Cart } from "./cart";
import Carts from "./repository";
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

// Quick and dirty acceptance test for our model
// Build this with `npm run build` and then run it
// `node dist/index.js`

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

(async () => {

  // Persist an empty cart
  let empty = new Cart();
  await Carts.put(empty);

  // persist a cart with items
  let cart = new Cart();
  cart.addItem("carrots", 4, 8);
  await Carts.put(cart);

  // Check that a persisted cart has v0
  cart = await Carts.get(cart.id);
  assert.equal(0, cart.version);

  // add a new item to our cart
  cart.addItem("dragon fruit", 1, 130);

  // refresh in the database
  await Carts.put(cart);
  cart = await Carts.get(cart.id);

  // check that we persisted correctly
  assert.equal(cart.total, 162);
  assert.equal(1, cart.version);

  // check that we can set the quantity
  cart.setQuantity("dragon fruit", 5);
  await Carts.put(cart);
  cart = await Carts.get(cart.id);

  assert.equal(cart.total, 682);
})();
