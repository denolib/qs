import { test } from "https://deno.land/std/testing/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { parse } from "./parse.ts";
import * as utils from "./utils.ts";

test({
  name: "parses a simple string",
  fn: () => {
    assertEquals(parse("0=foo"), { 0: "foo" });
    assertEquals(parse("foo=c++"), { foo: "c  " });
    assertEquals(parse("a[>=]=23"), { a: { ">=": "23" } });
    assertEquals(parse("a[<=>]==23"), { a: { "<=>": "=23" } });
    assertEquals(parse("a[==]=23"), { a: { "==": "23" } });
    assertEquals(parse("foo", { strictNullHandling: true }), { foo: null });
    assertEquals(parse("foo"), { foo: "" });
    assertEquals(parse("foo="), { foo: "" });
    assertEquals(parse("foo=bar"), { foo: "bar" });
    assertEquals(parse(" foo = bar = baz "), { " foo ": " bar = baz " });
    assertEquals(parse("foo=bar=baz"), { foo: "bar=baz" });
    assertEquals(parse("foo=bar&bar=baz"), { foo: "bar", bar: "baz" });
    assertEquals(parse("foo2=bar2&baz2="), { foo2: "bar2", baz2: "" });
    assertEquals(parse("foo=bar&baz", { strictNullHandling: true }), {
      foo: "bar",
      baz: null
    });
    assertEquals(parse("foo=bar&baz"), { foo: "bar", baz: "" });
    assertEquals(parse("cht=p3&chd=t:60,40&chs=250x100&chl=Hello|World"), {
      cht: "p3",
      chd: "t:60,40",
      chs: "250x100",
      chl: "Hello|World"
    });
  }
});

test({
  name: "allows enabling dot notation",
  fn: () => {
    assertEquals(parse("a.b=c"), { "a.b": "c" });
    assertEquals(parse("a.b=c", { allowDots: true }), { a: { b: "c" } });
  }
});

assertEquals(
  parse("a[b]=c"),
  { a: { b: "c" } },
  "parses a single nested string"
);
assertEquals(
  parse("a[b][c]=d"),
  { a: { b: { c: "d" } } },
  "parses a double nested string"
);
assertEquals(
  parse("a[b][c][d][e][f][g][h]=i"),
  { a: { b: { c: { d: { e: { f: { "[g][h]": "i" } } } } } } },
  "defaults to a depth of 5"
);

test({
  name: "only parses one level when depth = 1",
  fn: () => {
    assertEquals(parse("a[b][c]=d", { depth: 1 }), {
      a: { b: { "[c]": "d" } }
    });
    assertEquals(parse("a[b][c][d]=e", { depth: 1 }), {
      a: { b: { "[c][d]": "e" } }
    });
  }
});

assertEquals(parse("a=b&a=c"), { a: ["b", "c"] }, "parses a simple array");

test({
  name: "parses an explicit array",
  fn: () => {
    assertEquals(parse("a[]=b"), { a: ["b"] });
    assertEquals(parse("a[]=b&a[]=c"), { a: ["b", "c"] });
    assertEquals(parse("a[]=b&a[]=c&a[]=d"), { a: ["b", "c", "d"] });
  }
});

test({
  name: "parses a mix of simple and explicit arrays",
  fn: () => {
    assertEquals(parse("a=b&a[]=c"), { a: ["b", "c"] });
    assertEquals(parse("a[]=b&a=c"), { a: ["b", "c"] });
    assertEquals(parse("a[0]=b&a=c"), { a: ["b", "c"] });
    assertEquals(parse("a=b&a[0]=c"), { a: ["b", "c"] });

    assertEquals(parse("a[1]=b&a=c", { arrayLimit: 20 }), { a: ["b", "c"] });
    assertEquals(parse("a[]=b&a=c", { arrayLimit: 0 }), { a: ["b", "c"] });
    assertEquals(parse("a[]=b&a=c"), { a: ["b", "c"] });

    assertEquals(parse("a=b&a[1]=c", { arrayLimit: 20 }), { a: ["b", "c"] });
    assertEquals(parse("a=b&a[]=c", { arrayLimit: 0 }), { a: ["b", "c"] });
    assertEquals(parse("a=b&a[]=c"), { a: ["b", "c"] });
  }
});

test({
  name: "parses a nested array",
  fn: () => {
    assertEquals(parse("a[b][]=c&a[b][]=d"), { a: { b: ["c", "d"] } });
    assertEquals(parse("a[>=]=25"), { a: { ">=": "25" } });
  }
});

test({
  name: "allows to specify array indices",
  fn: () => {
    assertEquals(parse("a[1]=c&a[0]=b&a[2]=d"), { a: ["b", "c", "d"] });
    assertEquals(parse("a[1]=c&a[0]=b"), { a: ["b", "c"] });
    assertEquals(parse("a[1]=c", { arrayLimit: 20 }), { a: ["c"] });
    assertEquals(parse("a[1]=c", { arrayLimit: 0 }), { a: { 1: "c" } });
    assertEquals(parse("a[1]=c"), { a: ["c"] });
  }
});

test({
  name: "limits specific array indices to arrayLimit",
  fn: () => {
    assertEquals(parse("a[20]=a", { arrayLimit: 20 }), { a: ["a"] });
    assertEquals(parse("a[21]=a", { arrayLimit: 20 }), { a: { 21: "a" } });
  }
});

assertEquals(
  parse("a[12b]=c"),
  { a: { "12b": "c" } },
  "supports keys that begin with a number"
);

test({
  name: "supports encoded = signs",
  fn: () => {
    assertEquals(parse("he%3Dllo=th%3Dere"), { "he=llo": "th=ere" });
  }
});

test({
  name: "is ok with url encoded strings",
  fn: () => {
    assertEquals(parse("a[b%20c]=d"), { a: { "b c": "d" } });
    assertEquals(parse("a[b]=c%20d"), { a: { b: "c d" } });
  }
});

test({
  name: "allows brackets in the value",
  fn: () => {
    assertEquals(parse('pets=["tobi"]'), { pets: '["tobi"]' });
    assertEquals(parse('operators=[">=", "<="]'), {
      operators: '[">=", "<="]'
    });
  }
});

test({
  name: "allows empty values",
  fn: () => {
    assertEquals(parse(""), {});
    assertEquals(parse(null), {});
    assertEquals(parse(undefined), {});
  }
});

test({
  name: "transforms arrays to objects",
  fn: () => {
    assertEquals(parse("foo[0]=bar&foo[bad]=baz"), {
      foo: { 0: "bar", bad: "baz" }
    });
    assertEquals(parse("foo[bad]=baz&foo[0]=bar"), {
      foo: { bad: "baz", 0: "bar" }
    });
    assertEquals(parse("foo[bad]=baz&foo[]=bar"), {
      foo: { bad: "baz", 0: "bar" }
    });
    assertEquals(parse("foo[]=bar&foo[bad]=baz"), {
      foo: { 0: "bar", bad: "baz" }
    });
    assertEquals(parse("foo[bad]=baz&foo[]=bar&foo[]=foo"), {
      foo: { bad: "baz", 0: "bar", 1: "foo" }
    });
    assertEquals(parse("foo[0][a]=a&foo[0][b]=b&foo[1][a]=aa&foo[1][b]=bb"), {
      foo: [{ a: "a", b: "b" }, { a: "aa", b: "bb" }]
    });

    assertEquals(
      parse("a[]=b&a[t]=u&a[hasOwnProperty]=c", { allowPrototypes: false }),
      {
        a: { 0: "b", t: "u" }
      }
    );
    assertEquals(
      parse("a[]=b&a[t]=u&a[hasOwnProperty]=c", { allowPrototypes: true }),
      {
        a: { 0: "b", t: "u", hasOwnProperty: "c" }
      }
    );
    assertEquals(
      parse("a[]=b&a[hasOwnProperty]=c&a[x]=y", { allowPrototypes: false }),
      {
        a: { 0: "b", x: "y" }
      }
    );
    assertEquals(
      parse("a[]=b&a[hasOwnProperty]=c&a[x]=y", { allowPrototypes: true }),
      {
        a: { 0: "b", hasOwnProperty: "c", x: "y" }
      }
    );
  }
});

test({
  name: "transforms arrays to objects (dot notation)",
  fn: () => {
    assertEquals(parse("foo[0].baz=bar&fool.bad=baz", { allowDots: true }), {
      foo: [{ baz: "bar" }],
      fool: { bad: "baz" }
    });
    assertEquals(
      parse("foo[0].baz=bar&fool.bad.boo=baz", { allowDots: true }),
      {
        foo: [{ baz: "bar" }],
        fool: { bad: { boo: "baz" } }
      }
    );
    assertEquals(parse("foo[0][0].baz=bar&fool.bad=baz", { allowDots: true }), {
      foo: [[{ baz: "bar" }]],
      fool: { bad: "baz" }
    });
    assertEquals(parse("foo[0].baz[0]=15&foo[0].bar=2", { allowDots: true }), {
      foo: [{ baz: ["15"], bar: "2" }]
    });
    assertEquals(
      parse("foo[0].baz[0]=15&foo[0].baz[1]=16&foo[0].bar=2", {
        allowDots: true
      }),
      {
        foo: [{ baz: ["15", "16"], bar: "2" }]
      }
    );
    assertEquals(parse("foo.bad=baz&foo[0]=bar", { allowDots: true }), {
      foo: { bad: "baz", 0: "bar" }
    });
    assertEquals(parse("foo.bad=baz&foo[]=bar", { allowDots: true }), {
      foo: { bad: "baz", 0: "bar" }
    });
    assertEquals(parse("foo[]=bar&foo.bad=baz", { allowDots: true }), {
      foo: { 0: "bar", bad: "baz" }
    });
    assertEquals(
      parse("foo.bad=baz&foo[]=bar&foo[]=foo", { allowDots: true }),
      {
        foo: { bad: "baz", 0: "bar", 1: "foo" }
      }
    );
    assertEquals(
      parse("foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb", {
        allowDots: true
      }),
      {
        foo: [{ a: "a", b: "b" }, { a: "aa", b: "bb" }]
      }
    );
  }
});

test({
  name:
    "correctly prunes undefined values when converting an array to an object",
  fn: () => {
    assertEquals(parse("a[2]=b&a[99999999]=c"), {
      a: { 2: "b", 99999999: "c" }
    });
  }
});

test({
  name: "supports malformed uri characters",
  fn: () => {
    assertEquals(parse("{%:%}", { strictNullHandling: true }), {
      "{%:%}": null
    });
    assertEquals(parse("{%:%}="), { "{%:%}": "" });
    assertEquals(parse("foo=%:%}"), { foo: "%:%}" });
  }
});

test({
  name: "doesn't produce empty keys",
  fn: () => {
    assertEquals(parse("_r=1&"), { _r: "1" });
  }
});

test({
  name: "cannot access Object prototype",
  fn: () => {
    parse("constructor[prototype][bad]=bad");
    parse("bad[constructor][prototype][bad]=bad");
    assertEquals(typeof Object.prototype["bad"], "undefined");
  }
});

test({
  name: "parses arrays of objects",
  fn: () => {
    assertEquals(parse("a[][b]=c"), { a: [{ b: "c" }] });
    assertEquals(parse("a[0][b]=c"), { a: [{ b: "c" }] });
  }
});

test({
  name: "allows for empty strings in arrays",
  fn: () => {
    assertEquals(parse("a[]=b&a[]=&a[]=c"), { a: ["b", "", "c"] });

    assertEquals(
      parse("a[0]=b&a[1]&a[2]=c&a[19]=", {
        strictNullHandling: true,
        arrayLimit: 20
      }),
      { a: ["b", null, "c", ""] },
      "with arrayLimit 20 + array indices: null then empty string works"
    );
    assertEquals(
      parse("a[]=b&a[]&a[]=c&a[]=", {
        strictNullHandling: true,
        arrayLimit: 0
      }),
      { a: ["b", null, "c", ""] },
      "with arrayLimit 0 + array brackets: null then empty string works"
    );

    assertEquals(
      parse("a[0]=b&a[1]=&a[2]=c&a[19]", {
        strictNullHandling: true,
        arrayLimit: 20
      }),
      { a: ["b", "", "c", null] },
      "with arrayLimit 20 + array indices: empty string then null works"
    );
    assertEquals(
      parse("a[]=b&a[]=&a[]=c&a[]", {
        strictNullHandling: true,
        arrayLimit: 0
      }),
      { a: ["b", "", "c", null] },
      "with arrayLimit 0 + array brackets: empty string then null works"
    );

    assertEquals(
      parse("a[]=&a[]=b&a[]=c"),
      { a: ["", "b", "c"] },
      "array brackets: empty strings work"
    );
  }
});

test({
  name: "compacts sparse arrays",
  fn: () => {
    assertEquals(parse("a[10]=1&a[2]=2", { arrayLimit: 20 }), {
      a: ["2", "1"]
    });
    assertEquals(parse("a[1][b][2][c]=1", { arrayLimit: 20 }), {
      a: [{ b: [{ c: "1" }] }]
    });
    assertEquals(parse("a[1][2][3][c]=1", { arrayLimit: 20 }), {
      a: [[[{ c: "1" }]]]
    });
    assertEquals(parse("a[1][2][3][c][1]=1", { arrayLimit: 20 }), {
      a: [[[{ c: ["1"] }]]]
    });
  }
});

test({
  name: "parses semi-parsed strings",
  fn: () => {
    assertEquals(parse({ "a[b]": "c" }), { a: { b: "c" } });
    assertEquals(parse({ "a[b]": "c", "a[d]": "e" }), {
      a: { b: "c", d: "e" }
    });
  }
});

// test({name: 'parses buffers correctly', fn: () => {
//   const b = SaferBuffer.from('test')
//   assertEquals(parse({ a: b }), { a: b })
// }})

test({
  name: "parses jquery-param strings",
  fn: () => {
    // readable = 'filter[0][]=int1&filter[0][]==&filter[0][]=77&filter[]=and&filter[2][]=int2&filter[2][]==&filter[2][]=8'
    const encoded =
      "filter%5B0%5D%5B%5D=int1&filter%5B0%5D%5B%5D=%3D&filter%5B0%5D%5B%5D=77&filter%5B%5D=and&filter%5B2%5D%5B%5D=int2&filter%5B2%5D%5B%5D=%3D&filter%5B2%5D%5B%5D=8";
    const expected = {
      filter: [["int1", "=", "77"], "and", ["int2", "=", "8"]]
    };
    assertEquals(parse(encoded), expected);
  }
});

test({
  name: "continues parsing when no parent is found",
  fn: () => {
    assertEquals(parse("[]=&a=b"), { 0: "", a: "b" });
    assertEquals(parse("[]&a=b", { strictNullHandling: true }), {
      0: null,
      a: "b"
    });
    assertEquals(parse("[foo]=bar"), { foo: "bar" });
  }
});

// test({name: 'does not error when parsing a very long array', fn: () => {
//   const str = 'a[]=a'
//   while (Buffer.byteLength(str) < 128 * 1024) {
//     str = str + '&' + str
//   }

//   st.doesNotThrow(function() {
//     parse(str)
//   })
// }})

test({
  name: "should not throw when a native prototype has an enumerable property",
  fn: () => {
    Object.prototype["crash"] = "";
    Array.prototype["crash"] = "";
    parse.bind(null, "a=b");
    assertEquals(parse("a=b"), { a: "b" });
    parse.bind(null, "a[][b]=c");
    assertEquals(parse("a[][b]=c"), { a: [{ b: "c" }] });
    delete Object.prototype["crash"];
    delete Array.prototype["crash"];
  }
});

test({
  name: "parses a string with an alternative string delimiter",
  fn: () => {
    assertEquals(parse("a=b;c=d", { delimiter: ";" }), { a: "b", c: "d" });
  }
});

test({
  name: "parses a string with an alternative RegExp delimiter",
  fn: () => {
    assertEquals(parse("a=b; c=d", { delimiter: /[;,] */ }), {
      a: "b",
      c: "d"
    });
  }
});

test({
  name: "does not use non-splittable objects as delimiters",
  fn: () => {
    assertEquals(parse("a=b&c=d", { delimiter: true }), { a: "b", c: "d" });
  }
});

test({
  name: "allows overriding parameter limit",
  fn: () => {
    assertEquals(parse("a=b&c=d", { parameterLimit: 1 }), { a: "b" });
  }
});

test({
  name: "allows setting the parameter limit to Infinity",
  fn: () => {
    assertEquals(parse("a=b&c=d", { parameterLimit: Infinity }), {
      a: "b",
      c: "d"
    });
  }
});

test({
  name: "allows overriding array limit",
  fn: () => {
    assertEquals(parse("a[0]=b", { arrayLimit: -1 }), { a: { 0: "b" } });
    assertEquals(parse("a[-1]=b", { arrayLimit: -1 }), { a: { "-1": "b" } });
    assertEquals(parse("a[0]=b&a[1]=c", { arrayLimit: 0 }), {
      a: { 0: "b", 1: "c" }
    });
  }
});

test({
  name: "allows disabling array parsing",
  fn: () => {
    const indices = parse("a[0]=b&a[1]=c", { parseArrays: false });
    assertEquals(indices, { a: { 0: "b", 1: "c" } });
    assertEquals(
      Array.isArray(indices.a),
      false,
      "parseArrays:false, indices case is not an array"
    );

    const emptyBrackets = parse("a[]=b", { parseArrays: false });
    assertEquals(emptyBrackets, { a: { 0: "b" } });
    assertEquals(
      Array.isArray(emptyBrackets.a),
      false,
      "parseArrays:false, empty brackets case is not an array"
    );
  }
});

test({
  name: "allows for query string prefix",
  fn: () => {
    assertEquals(parse("?foo=bar", { ignoreQueryPrefix: true }), {
      foo: "bar"
    });
    assertEquals(parse("foo=bar", { ignoreQueryPrefix: true }), { foo: "bar" });
    assertEquals(parse("?foo=bar", { ignoreQueryPrefix: false }), {
      "?foo": "bar"
    });
  }
});

test({
  name: "parses an object",
  fn: () => {
    const input = {
      "user[name]": { "pop[bob]": 3 },
      "user[email]": null
    };

    const expected = {
      user: {
        name: { "pop[bob]": 3 },
        email: null
      }
    };

    const result = parse(input);

    assertEquals(result, expected);
  }
});

test({
  name: "parses an object in dot notation",
  fn: () => {
    const input = {
      "user.name": { "pop[bob]": 3 },
      "user.email.": null
    };

    const expected = {
      user: {
        name: { "pop[bob]": 3 },
        email: null
      }
    };

    const result = parse(input, { allowDots: true });

    assertEquals(result, expected);
  }
});

test({
  name: "parses an object and not child values",
  fn: () => {
    const input = {
      "user[name]": { "pop[bob]": { test: 3 } },
      "user[email]": null
    };

    const expected = {
      user: {
        name: { "pop[bob]": { test: 3 } },
        email: null
      }
    };

    const result = parse(input);

    assertEquals(result, expected);
  }
});

// {name: test('does not blow up when Buffer global is missing', fn: () => {
//   const tempBuffer = global.Buffer
//   delete global.Buffer
//   const result = parse('a=b&c=d')
//   global.Buffer = tempBuffer
//   assertEquals(result, { a: 'b', c: 'd' })
// }})

test({
  name: "does not crash when parsing circular references",
  fn: () => {
    const a = {};
    a["b"] = a;

    const parsed = parse({ "foo[bar]": "baz", "foo[baz]": a });

    assertEquals("foo" in parsed, true, 'parsed has "foo" property');
    assertEquals("bar" in parsed.foo, true);
    assertEquals("baz" in parsed.foo, true);
    assertEquals(parsed.foo.bar, "baz");
    assertEquals(parsed.foo.baz, a);
  }
});

test({
  name: "does not crash when parsing deep objects",
  fn: () => {
    let parsed;
    let str = "foo";

    for (let i = 0; i < 5000; i++) {
      str += "[p]";
    }

    str += "=bar";

    parsed = parse(str, { depth: 5000 });

    assertEquals("foo" in parsed, true, 'parsed has "foo" property');

    let depth = 0;
    let ref = parsed.foo;
    while ((ref = ref.p)) {
      depth += 1;
    }

    assertEquals(depth, 5000, "parsed is 5000 properties deep");
  }
});

test({
  name: "parses null objects correctly",
  fn: () => {
    const a = Object.create(null);
    a.b = "c";

    assertEquals(parse(a), { b: "c" });
    const result = parse({ a: a });
    assertEquals("a" in result, true, 'result has "a" property');
    assertEquals(result.a, a);
  }
});

test({
  name: "parses dates correctly",
  fn: () => {
    const now = new Date();
    assertEquals(parse({ a: now }), { a: now });
  }
});

test({
  name: "parses regular expressions correctly",
  fn: () => {
    const re = /^test$/;
    assertEquals(parse({ a: re }), { a: re });
  }
});

test({
  name: "does not allow overwriting prototype properties",
  fn: () => {
    assertEquals(parse("a[hasOwnProperty]=b", { allowPrototypes: false }), {});
    assertEquals(parse("hasOwnProperty=b", { allowPrototypes: false }), {});

    assertEquals(
      parse("toString", { allowPrototypes: false }),
      {},
      'bare "toString" results in {}'
    );
  }
});

test({
  name: "can allow overwriting prototype properties",
  fn: () => {
    assertEquals(parse("a[hasOwnProperty]=b", { allowPrototypes: true }), {
      a: { hasOwnProperty: "b" }
    });
    assertEquals(parse("hasOwnProperty=b", { allowPrototypes: true }), {
      hasOwnProperty: "b"
    });

    assertEquals(
      parse("toString", { allowPrototypes: true }),
      { toString: "" },
      'bare "toString" results in { toString: "" }'
    );
  }
});

test({
  name: "params starting with a closing bracket",
  fn: () => {
    assertEquals(parse("]=toString"), { "]": "toString" });
    assertEquals(parse("]]=toString"), { "]]": "toString" });
    assertEquals(parse("]hello]=toString"), { "]hello]": "toString" });
  }
});

test({
  name: "params starting with a starting bracket",
  fn: () => {
    assertEquals(parse("[=toString"), { "[": "toString" });
    assertEquals(parse("[[=toString"), { "[[": "toString" });
    assertEquals(parse("[hello[=toString"), { "[hello[": "toString" });
  }
});

test({
  name: "add keys to objects",
  fn: () => {
    assertEquals(
      parse("a[b]=c&a=d"),
      { a: { b: "c", d: true } },
      "can add keys to objects"
    );

    assertEquals(
      parse("a[b]=c&a=toString"),
      { a: { b: "c" } },
      "can not overwrite prototype"
    );

    assertEquals(
      parse("a[b]=c&a=toString", { allowPrototypes: true }),
      { a: { b: "c", toString: true } },
      "can overwrite prototype with allowPrototypes true"
    );

    assertEquals(
      parse("a[b]=c&a=toString", { plainObjects: true }),
      { a: { b: "c", toString: true } },
      "can overwrite prototype with plainObjects true"
    );
  }
});

test({
  name: "can return null objects",
  fn: () => {
    const expected = Object.create(null);
    expected.a = Object.create(null);
    expected.a.b = "c";
    expected.a.hasOwnProperty = "d";
    assertEquals(
      parse("a[b]=c&a[hasOwnProperty]=d", { plainObjects: true }),
      expected
    );
    assertEquals(parse(null, { plainObjects: true }), Object.create(null));
    const expectedArray = Object.create(null);
    expectedArray.a = Object.create(null);
    expectedArray.a[0] = "b";
    expectedArray.a.c = "d";
    assertEquals(parse("a[]=b&a[c]=d", { plainObjects: true }), expectedArray);
  }
});

// {name: test('can parse with custom encoding', fn: () => {
//   assertEquals(
//     parse('%8c%a7=%91%e5%8d%e3%95%7b', {
//       decoder: function(str) {
//         const reg = /%([0-9A-F]{2})/gi
//         const result = []
//         let parts = reg.exec(str)
//         while (parts) {
//           result.push(parseInt(parts[1], 16))
//           parts = reg.exec(str)
//         }
//         return iconv.decode(SaferBuffer.from(result), 'shift_jis').toString()
//       }
//     }),
//     { 県: '大阪府' }
//   )
// }})

test({
  name: "receives the default decoder as a second argument",
  fn: () => {
    parse("a", {
      decoder: function(str, defaultDecoder) {
        assertEquals(defaultDecoder, utils.decode);
        return "";
      }
    });
  }
});

test({
  name: "throws error with wrong decoder",
  fn: () => {
    try {
      parse({}, { decoder: "string" as any });
    } catch (e) {
      assertEquals(e, new TypeError("Decoder has to be a function."));
    }
  }
});

test({
  name: "does not mutate the options argument",
  fn: () => {
    const options = {};
    parse("a[b]=true", options);
    assertEquals(options, {});
  }
});

test({
  name: "throws if an invalid charset is specified",
  fn: () => {
    try {
      parse("a=b", { charset: "foobar" });
    } catch (e) {
      assertEquals(
        e,
        new TypeError(
          "The charset option must be either utf-8, iso-8859-1, or undefined"
        )
      );
    }
  }
});

test({
  name: "parses an iso-8859-1 string if asked to",
  fn: () => {
    assertEquals(parse("%A2=%BD", { charset: "iso-8859-1" }), { "¢": "½" });
  }
});

const urlEncodedCheckmarkInUtf8 = "%E2%9C%93";
const urlEncodedOSlashInUtf8 = "%C3%B8";
const urlEncodedNumCheckmark = "%26%2310003%3B";
const urlEncodedNumSmiley = "%26%239786%3B";

test({
  name:
    "prefers an utf-8 charset specified by the utf8 sentinel to a default charset of iso-8859-1",
  fn: () => {
    assertEquals(
      parse(
        "utf8=" +
          urlEncodedCheckmarkInUtf8 +
          "&" +
          urlEncodedOSlashInUtf8 +
          "=" +
          urlEncodedOSlashInUtf8,
        { charsetSentinel: true, charset: "iso-8859-1" }
      ),
      { ø: "ø" }
    );
  }
});

test({
  name:
    "prefers an iso-8859-1 charset specified by the utf8 sentinel to a default charset of utf-8",
  fn: () => {
    assertEquals(
      parse(
        "utf8=" +
          urlEncodedNumCheckmark +
          "&" +
          urlEncodedOSlashInUtf8 +
          "=" +
          urlEncodedOSlashInUtf8,
        { charsetSentinel: true, charset: "utf-8" }
      ),
      { "Ã¸": "Ã¸" }
    );
  }
});

test({
  name:
    "does not require the utf8 sentinel to be defined before the parameters whose decoding it affects",
  fn: () => {
    assertEquals(
      parse("a=" + urlEncodedOSlashInUtf8 + "&utf8=" + urlEncodedNumCheckmark, {
        charsetSentinel: true,
        charset: "utf-8"
      }),
      { a: "Ã¸" }
    );
  }
});

test({
  name: "should ignore an utf8 sentinel with an unknown value",
  fn: () => {
    assertEquals(
      parse(
        "utf8=foo&" + urlEncodedOSlashInUtf8 + "=" + urlEncodedOSlashInUtf8,
        {
          charsetSentinel: true,
          charset: "utf-8"
        }
      ),
      { ø: "ø" }
    );
  }
});

test({
  name:
    "uses the utf8 sentinel to switch to utf-8 when no default charset is given",
  fn: () => {
    assertEquals(
      parse(
        "utf8=" +
          urlEncodedCheckmarkInUtf8 +
          "&" +
          urlEncodedOSlashInUtf8 +
          "=" +
          urlEncodedOSlashInUtf8,
        { charsetSentinel: true }
      ),
      { ø: "ø" }
    );
  }
});

test({
  name:
    "uses the utf8 sentinel to switch to iso-8859-1 when no default charset is given",
  fn: () => {
    assertEquals(
      parse(
        "utf8=" +
          urlEncodedNumCheckmark +
          "&" +
          urlEncodedOSlashInUtf8 +
          "=" +
          urlEncodedOSlashInUtf8,
        { charsetSentinel: true }
      ),
      { "Ã¸": "Ã¸" }
    );
  }
});

test({
  name:
    "interprets numeric entities in iso-8859-1 when `interpretNumericEntities`",
  fn: () => {
    assertEquals(
      parse("foo=" + urlEncodedNumSmiley, {
        charset: "iso-8859-1",
        interpretNumericEntities: true
      }),
      { foo: "☺" }
    );
  }
});

test({
  name:
    "handles a custom decoder returning `null`, in the `iso-8859-1` charset, when `interpretNumericEntities`",
  fn: () => {
    assertEquals(
      parse("foo=&bar=" + urlEncodedNumSmiley, {
        charset: "iso-8859-1",
        decoder: function(str, defaultDecoder, charset) {
          return str ? defaultDecoder(str, defaultDecoder, charset) : null;
        },
        interpretNumericEntities: true
      }),
      { foo: null, bar: "☺" }
    );
  }
});

test({
  name:
    "does not interpret numeric entities in iso-8859-1 when `interpretNumericEntities` is absent",
  fn: () => {
    assertEquals(
      parse("foo=" + urlEncodedNumSmiley, { charset: "iso-8859-1" }),
      { foo: "&#9786;" }
    );
  }
});

test({
  name:
    "does not interpret numeric entities when the charset is utf-8, even when `interpretNumericEntities`",
  fn: () => {
    assertEquals(
      parse("foo=" + urlEncodedNumSmiley, {
        charset: "utf-8",
        interpretNumericEntities: true
      }),
      { foo: "&#9786;" }
    );
  }
});

test({
  name: "does not interpret %uXXXX syntax in iso-8859-1 mode",
  fn: () => {
    assertEquals(parse("%u263A=%u263A", { charset: "iso-8859-1" }), {
      "%u263A": "%u263A"
    });
  }
});
