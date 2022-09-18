import { Cart } from "./cart";
import { serialize, deserialize } from "./repository";

describe("When persisting an empty cart", () => {
  const cart = new Cart("1234");

  const command = serialize(cart);

  it("should insert an empty cart", () => {
    expect(command.input).toEqual({
      TableName: "shopping-cart",
      Item: {
        pk: { S: "cart-1234" },
        sk: { S: "__cart" },
        version: { N: "0" },
      },
      ConditionExpression: "attribute_not_exists(pk)",
    });
  });
});

describe("When persisting a new cart with items", () => {
  const cart = new Cart("1234");
  cart.addItem("apples", 3, 10);
  cart.addItem("bananas", 2, 15);

  const command = serialize(cart);

  it("should insert a cart with items", () => {
    expect(command.input).toEqual({
      TransactItems: [
        {
          Put: {
            TableName: "shopping-cart",
            Item: {
              pk: { S: "cart-1234" },
              sk: { S: "__cart" },
              version: { N: "0" },
            },
            ConditionExpression: "attribute_not_exists(pk)",
          },
        },
        {
          Put: {
            TableName: "shopping-cart",
            Item: {
              pk: { S: "cart-1234" },
              sk: { S: "apples" },
              qty: { N: "3" },
              price: { N: "10" },
            },
          },
        },
        {
          Put: {
            TableName: "shopping-cart",
            Item: {
              pk: { S: "cart-1234" },
              sk: { S: "bananas" },
              qty: { N: "2" },
              price: { N: "15" },
            },
          },
        },
      ],
    });
  });
});

describe("When deserializing a cart", () => {
  const response = {
    Items: [
      {
        version: { N: "0" },
        sk: { S: "__cart" },
        pk: { S: "cart-123" },
      },
      {
        sk: { S: "carrots" },
        pk: { S: "cart-123" },
        price: { N: "8" },
        qty: { N: "4" },
      },
    ],
  };

  const cart = deserialize(response);

  it("should have the correct cart id", () => {
    expect(cart.id).toEqual("123");
  });

  it("should not contain any changed items", () => {
    expect(cart.changedItems).toHaveLength(0);
  });

  it("should have the correct total", () => {
    expect(cart.total).toEqual(32);
  });
});

describe("When inserting a new item", () => {
  const cart = new Cart("abc", 0, []);
  cart.addItem("apples", 5, 20);

  const command = serialize(cart);
  const [cartItem, product] = command.input.TransactItems;

  it("should update the cart", () => {
    expect(cartItem).toEqual({
      Update: {
        TableName: "shopping-cart",
        Key: {
          pk: { S: "cart-abc" },
          sk: { S: "__cart" },
        },
        UpdateExpression: "ADD version :inc",
        ConditionExpression: "version = :prev",
        ExpressionAttributeValues: {
          ":inc": { N: "1" },
          ":prev": { N: "0" },
        },
      },
    });
  });

  it("should insert the new item", () => {
    expect(product).toEqual({
      Put: {
        TableName: "shopping-cart",
        Item: {
          pk: { S: "cart-abc" },
          sk: { S: "apples" },
          qty: { N: "5" },
          price: { N: "20" },
        },
      },
    });
  });
});
