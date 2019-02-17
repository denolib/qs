import { assertEqual, equal, test } from "https://deno.land/x/testing/mod.ts";
import * as utils from "utils.ts";

test({ name: "merge()", fn: () => {
  assertEqual(
    utils.merge({ a: "b" }, { a: "c" }),
    { a: ["b", "c"] },
    "merges two objects with the same key"
  );

  const oneMerged = utils.merge({ foo: "bar" }, { foo: { first: "123" } });
  assertEqual(
    oneMerged,
    { foo: ["bar", { first: "123" }] },
    "merges a standalone and an object into an array"
  );

  const twoMerged = utils.merge(
    { foo: ["bar", { first: "123" }] },
    { foo: { second: "456" } }
  );
  assertEqual(
    twoMerged,
    { foo: { 0: "bar", 1: { first: "123" }, second: "456" } },
    "merges a standalone and two objects into an array"
  );

  const sandwiched = utils.merge(
    { foo: ["bar", { first: "123", second: "456" }] },
    { foo: "baz" }
  );
  assertEqual(
    sandwiched,
    { foo: ["bar", { first: "123", second: "456" }, "baz"] },
    "merges an object sandwiched by two standalones into an array"
  );

  const nestedArrays = utils.merge({ foo: ["baz"] }, { foo: ["bar", "xyzzy"] });
  assertEqual(nestedArrays, { foo: ["baz", "bar", "xyzzy"] });

  const noOptionsNonObjectSource = utils.merge({ foo: "baz" }, "bar");
  assertEqual(noOptionsNonObjectSource, { foo: "baz", bar: true });
}});

test({ name: "avoids invoking array setters unnecessarily", fn: () => {
  let setCount = 0;
  let getCount = 0;
  const observed = [];
  Object.defineProperty(observed, 0, {
    get: function() {
      getCount += 1;
      return { bar: "baz" };
    },
    set: function() {
      setCount += 1;
    }
  });
  utils.merge(observed, [null]);
  assertEqual(setCount, 0);
  assertEqual(getCount, 2);
  observed[0] = observed[0];
  assertEqual(setCount, 1);
  assertEqual(getCount, 3);
}});

test({ name: "assign()", fn: () => {
  const target = { a: 1, b: 2 };
  const source = { b: 3, c: 4 };
  const result = utils.assign(target, source);

  assertEqual(result, target, "returns the target");
  assertEqual(target, { a: 1, b: 3, c: 4 }, "target and source are merged");
  assertEqual(source, { b: 3, c: 4 }, "source is untouched");
}});

test({ name: "both arrays", fn: () => {
  const a = [1];
  const b = [2];
  const combined = utils.combine(a, b);

  assertEqual(a, [1], "a is not mutated");
  assertEqual(b, [2], "b is not mutated");
  assertEqual(equal(a, combined), false, "a !== combined");
  assertEqual(equal(b, combined), false, "b !== combined");
  assertEqual(combined, [1, 2], "combined is a + b");
}});

test({ name: "one array, one non-array", fn: () => {
  const aN = 1;
  const a = [aN];
  const bN = 2;
  const b = [bN];

  const combinedAnB = utils.combine(aN, b);
  assertEqual(b, [bN], "b is not mutated");
  assertEqual(equal(aN, combinedAnB), false, "aN + b !== aN");
  assertEqual(equal(a, combinedAnB), false, "aN + b !== a");
  assertEqual(equal(bN, combinedAnB), false, "aN + b !== bN");
  assertEqual(equal(b, combinedAnB), false, "aN + b !== b");
  assertEqual(
    [1, 2],
    combinedAnB,
    "first argument is array-wrapped when not an array"
  );

  const combinedABn = utils.combine(a, bN);
  assertEqual(a, [aN], "a is not mutated");
  assertEqual(equal(aN, combinedABn), false, "a + bN !== aN");
  assertEqual(equal(a, combinedABn), false, "a + bN !== a");
  assertEqual(equal(bN, combinedABn), false, "a + bN !== bN");
  assertEqual(equal(b, combinedABn), false, "a + bN !== b");
  assertEqual(
    [1, 2],
    combinedABn,
    "second argument is array-wrapped when not an array"
  );
}});

test({ name: "neither is an array", fn: () => {
  const combined = utils.combine(1, 2);
  assertEqual(equal(1, combined), false, "1 + 2 !== 1");
  assertEqual(equal(2, combined), false, "1 + 2 !== 2");
  assertEqual(
    [1, 2],
    combined,
    "both arguments are array-wrapped when not an array"
  );
}});
