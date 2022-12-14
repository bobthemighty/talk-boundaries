import { Cart, EMPTY } from "./cart";

/*
 * Our cart object is an aggregate - a cluster of related
 * objects that act as a single boundary for persistence
 */

describe("An empty cart", () => {
  const cart = new Cart();

  it("should be empty", () => {
    expect(cart.version).toEqual(EMPTY);
    expect(cart.isEmpty()).toBe(true);
  });

  it("should have an autogenerated cart id", () => {
    expect(cart.id).toBeTruthy();
  });
});

describe("When adding an item to an empty cart", () => {
  const cart = new Cart();

  cart.addItem("apples", 5, 20);

  it("should contain a single changed item", () => {
    expect(cart.changedItems).toHaveLength(1);
  });

  it("should contain 5 apples", () => {
    const [product] = cart.changedItems;

    expect(product).toEqual({
      sku: "apples",
      qty: 5,
      price: 20,
    });
  });

  it("should total £1", () => {
    expect(cart.total).toEqual(100);
  });
});

describe("When updating a cart item", () => {
  const cart = new Cart();
  cart.addItem("bananas", 2, 16);

  cart.setQuantity("bananas", 4);

  it("should contain a single changed item", () => {
    expect(cart.changedItems).toHaveLength(1);
  });

  it("should have the correct quantity", () => {
    const [item] = cart.changedItems;
    expect(item.qty).toEqual(4);
  });
});
