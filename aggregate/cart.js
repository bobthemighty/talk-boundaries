import { v4 as uuidv4 } from "uuid";
export const EMPTY = -1;

export class Cart {
  // this is the version number we use for optimistic concurrency
  #version = -1;
  #cartId;
  #items;

  constructor(cartId, version, items) {
    this.#cartId = cartId || uuidv4();
    this.#version = version ?? -1;
    this.#items = items
      ? Object.fromEntries(items.map((item) => [item.sku, item]))
      : {};
  }

  // When we add a new item, we insert it into items and mark
  // it as changed. This is so we can select it in the `serialize`
  // function during persistence.
  addItem(sku, qty, price) {
    this.#items[sku] = { sku, qty, price, changed: true };
  }

  // Set quantity, likewise, updates the item in #items and marks
  // it changed for persistence.
  setQuantity(sku, qty) {
    this.#items[sku] = {
      ...this.#items[sku],
      qty,
      changed: true,
    };
  }

  get version() {
    return this.#version;
  }
  get id() {
    return this.#cartId;
  }
  isEmpty() {
    return Object.keys(this.#items).length === 0;
  }
  // This property selects the entries out of our items collection
  // that have been marked 'changed' and needing persistence
  get changedItems() {
    return Object.values(this.#items)
      .filter((item) => item.changed)
      .map(({ sku, price, qty }) => ({ sku, price, qty }));
  }
  get total() {
    return Object.values(this.#items).reduce(
      (total, item) => total + item.qty * item.price,
      0
    );
  }
}
