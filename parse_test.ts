import { assertEqual } from "https://deno.land/x/testing/testing.ts";
import { t } from "https://raw.githubusercontent.com/zhmushan/deno_test/master/index.ts";
import { parse } from "parse.ts";
import * as utils from "utils.ts";

t("parses a simple string", function() {
  assertEqual(parse("0=foo"), { 0: "foo" });
  assertEqual(parse("foo=c++"), { foo: "c  " });
  assertEqual(parse("a[>=]=23"), { a: { ">=": "23" } });
  assertEqual(parse("a[<=>]==23"), { a: { "<=>": "=23" } });
  assertEqual(parse("a[==]=23"), { a: { "==": "23" } });
  assertEqual(parse("foo", { strictNullHandling: true }), { foo: null });
  assertEqual(parse("foo"), { foo: "" });
  assertEqual(parse("foo="), { foo: "" });
  assertEqual(parse("foo=bar"), { foo: "bar" });
  assertEqual(parse(" foo = bar = baz "), { " foo ": " bar = baz " });
  assertEqual(parse("foo=bar=baz"), { foo: "bar=baz" });
  assertEqual(parse("foo=bar&bar=baz"), { foo: "bar", bar: "baz" });
  assertEqual(parse("foo2=bar2&baz2="), { foo2: "bar2", baz2: "" });
  assertEqual(parse("foo=bar&baz", { strictNullHandling: true }), {
    foo: "bar",
    baz: null
  });
  assertEqual(parse("foo=bar&baz"), { foo: "bar", baz: "" });
  assertEqual(parse("cht=p3&chd=t:60,40&chs=250x100&chl=Hello|World"), {
    cht: "p3",
    chd: "t:60,40",
    chs: "250x100",
    chl: "Hello|World"
  });
});

t("allows enabling dot notation", function() {
  assertEqual(parse("a.b=c"), { "a.b": "c" });
  assertEqual(parse("a.b=c", { allowDots: true }), { a: { b: "c" } });
});

assertEqual(
  parse("a[b]=c"),
  { a: { b: "c" } },
  "parses a single nested string"
);
assertEqual(
  parse("a[b][c]=d"),
  { a: { b: { c: "d" } } },
  "parses a double nested string"
);
assertEqual(
  parse("a[b][c][d][e][f][g][h]=i"),
  { a: { b: { c: { d: { e: { f: { "[g][h]": "i" } } } } } } },
  "defaults to a depth of 5"
);

t("only parses one level when depth = 1", function() {
  assertEqual(parse("a[b][c]=d", { depth: 1 }), { a: { b: { "[c]": "d" } } });
  assertEqual(parse("a[b][c][d]=e", { depth: 1 }), {
    a: { b: { "[c][d]": "e" } }
  });
});

assertEqual(parse("a=b&a=c"), { a: ["b", "c"] }, "parses a simple array");

t("parses an explicit array", function() {
  assertEqual(parse("a[]=b"), { a: ["b"] });
  assertEqual(parse("a[]=b&a[]=c"), { a: ["b", "c"] });
  assertEqual(parse("a[]=b&a[]=c&a[]=d"), { a: ["b", "c", "d"] });
});

t("parses a mix of simple and explicit arrays", function() {
  assertEqual(parse("a=b&a[]=c"), { a: ["b", "c"] });
  assertEqual(parse("a[]=b&a=c"), { a: ["b", "c"] });
  assertEqual(parse("a[0]=b&a=c"), { a: ["b", "c"] });
  assertEqual(parse("a=b&a[0]=c"), { a: ["b", "c"] });

  assertEqual(parse("a[1]=b&a=c", { arrayLimit: 20 }), { a: ["b", "c"] });
  assertEqual(parse("a[]=b&a=c", { arrayLimit: 0 }), { a: ["b", "c"] });
  assertEqual(parse("a[]=b&a=c"), { a: ["b", "c"] });

  assertEqual(parse("a=b&a[1]=c", { arrayLimit: 20 }), { a: ["b", "c"] });
  assertEqual(parse("a=b&a[]=c", { arrayLimit: 0 }), { a: ["b", "c"] });
  assertEqual(parse("a=b&a[]=c"), { a: ["b", "c"] });
});

t("parses a nested array", function() {
  assertEqual(parse("a[b][]=c&a[b][]=d"), { a: { b: ["c", "d"] } });
  assertEqual(parse("a[>=]=25"), { a: { ">=": "25" } });
});

t("allows to specify array indices", function() {
  assertEqual(parse("a[1]=c&a[0]=b&a[2]=d"), { a: ["b", "c", "d"] });
  assertEqual(parse("a[1]=c&a[0]=b"), { a: ["b", "c"] });
  assertEqual(parse("a[1]=c", { arrayLimit: 20 }), { a: ["c"] });
  assertEqual(parse("a[1]=c", { arrayLimit: 0 }), { a: { 1: "c" } });
  assertEqual(parse("a[1]=c"), { a: ["c"] });
});

t("limits specific array indices to arrayLimit", function() {
  assertEqual(parse("a[20]=a", { arrayLimit: 20 }), { a: ["a"] });
  assertEqual(parse("a[21]=a", { arrayLimit: 20 }), { a: { 21: "a" } });
});

assertEqual(
  parse("a[12b]=c"),
  { a: { "12b": "c" } },
  "supports keys that begin with a number"
);

t("supports encoded = signs", function() {
  assertEqual(parse("he%3Dllo=th%3Dere"), { "he=llo": "th=ere" });
});

t("is ok with url encoded strings", function() {
  assertEqual(parse("a[b%20c]=d"), { a: { "b c": "d" } });
  assertEqual(parse("a[b]=c%20d"), { a: { b: "c d" } });
});

t("allows brackets in the value", function() {
  assertEqual(parse('pets=["tobi"]'), { pets: '["tobi"]' });
  assertEqual(parse('operators=[">=", "<="]'), { operators: '[">=", "<="]' });
});

t("allows empty values", function() {
  assertEqual(parse(""), {});
  assertEqual(parse(null), {});
  assertEqual(parse(undefined), {});
});

t("transforms arrays to objects", function() {
  assertEqual(parse("foo[0]=bar&foo[bad]=baz"), {
    foo: { 0: "bar", bad: "baz" }
  });
  assertEqual(parse("foo[bad]=baz&foo[0]=bar"), {
    foo: { bad: "baz", 0: "bar" }
  });
  assertEqual(parse("foo[bad]=baz&foo[]=bar"), {
    foo: { bad: "baz", 0: "bar" }
  });
  assertEqual(parse("foo[]=bar&foo[bad]=baz"), {
    foo: { 0: "bar", bad: "baz" }
  });
  assertEqual(parse("foo[bad]=baz&foo[]=bar&foo[]=foo"), {
    foo: { bad: "baz", 0: "bar", 1: "foo" }
  });
  assertEqual(parse("foo[0][a]=a&foo[0][b]=b&foo[1][a]=aa&foo[1][b]=bb"), {
    foo: [{ a: "a", b: "b" }, { a: "aa", b: "bb" }]
  });

  assertEqual(
    parse("a[]=b&a[t]=u&a[hasOwnProperty]=c", { allowPrototypes: false }),
    {
      a: { 0: "b", t: "u" }
    }
  );
  assertEqual(
    parse("a[]=b&a[t]=u&a[hasOwnProperty]=c", { allowPrototypes: true }),
    {
      a: { 0: "b", t: "u", hasOwnProperty: "c" }
    }
  );
  assertEqual(
    parse("a[]=b&a[hasOwnProperty]=c&a[x]=y", { allowPrototypes: false }),
    {
      a: { 0: "b", x: "y" }
    }
  );
  assertEqual(
    parse("a[]=b&a[hasOwnProperty]=c&a[x]=y", { allowPrototypes: true }),
    {
      a: { 0: "b", hasOwnProperty: "c", x: "y" }
    }
  );
});

t("transforms arrays to objects (dot notation)", function() {
  assertEqual(parse("foo[0].baz=bar&fool.bad=baz", { allowDots: true }), {
    foo: [{ baz: "bar" }],
    fool: { bad: "baz" }
  });
  assertEqual(parse("foo[0].baz=bar&fool.bad.boo=baz", { allowDots: true }), {
    foo: [{ baz: "bar" }],
    fool: { bad: { boo: "baz" } }
  });
  assertEqual(parse("foo[0][0].baz=bar&fool.bad=baz", { allowDots: true }), {
    foo: [[{ baz: "bar" }]],
    fool: { bad: "baz" }
  });
  assertEqual(parse("foo[0].baz[0]=15&foo[0].bar=2", { allowDots: true }), {
    foo: [{ baz: ["15"], bar: "2" }]
  });
  assertEqual(
    parse("foo[0].baz[0]=15&foo[0].baz[1]=16&foo[0].bar=2", {
      allowDots: true
    }),
    {
      foo: [{ baz: ["15", "16"], bar: "2" }]
    }
  );
  assertEqual(parse("foo.bad=baz&foo[0]=bar", { allowDots: true }), {
    foo: { bad: "baz", 0: "bar" }
  });
  assertEqual(parse("foo.bad=baz&foo[]=bar", { allowDots: true }), {
    foo: { bad: "baz", 0: "bar" }
  });
  assertEqual(parse("foo[]=bar&foo.bad=baz", { allowDots: true }), {
    foo: { 0: "bar", bad: "baz" }
  });
  assertEqual(parse("foo.bad=baz&foo[]=bar&foo[]=foo", { allowDots: true }), {
    foo: { bad: "baz", 0: "bar", 1: "foo" }
  });
  assertEqual(
    parse("foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb", { allowDots: true }),
    {
      foo: [{ a: "a", b: "b" }, { a: "aa", b: "bb" }]
    }
  );
});

t(
  "correctly prunes undefined values when converting an array to an object",
  function() {
    assertEqual(parse("a[2]=b&a[99999999]=c"), {
      a: { 2: "b", 99999999: "c" }
    });
  }
);

t("supports malformed uri characters", function() {
  assertEqual(parse("{%:%}", { strictNullHandling: true }), { "{%:%}": null });
  assertEqual(parse("{%:%}="), { "{%:%}": "" });
  assertEqual(parse("foo=%:%}"), { foo: "%:%}" });
});

t("doesn't produce empty keys", function() {
  assertEqual(parse("_r=1&"), { _r: "1" });
});

t("cannot access Object prototype", function() {
  parse("constructor[prototype][bad]=bad");
  parse("bad[constructor][prototype][bad]=bad");
  assertEqual(typeof Object.prototype["bad"], "undefined");
});

t("parses arrays of objects", function() {
  assertEqual(parse("a[][b]=c"), { a: [{ b: "c" }] });
  assertEqual(parse("a[0][b]=c"), { a: [{ b: "c" }] });
});

t("allows for empty strings in arrays", function() {
  assertEqual(parse("a[]=b&a[]=&a[]=c"), { a: ["b", "", "c"] });

  assertEqual(
    parse("a[0]=b&a[1]&a[2]=c&a[19]=", {
      strictNullHandling: true,
      arrayLimit: 20
    }),
    { a: ["b", null, "c", ""] },
    "with arrayLimit 20 + array indices: null then empty string works"
  );
  assertEqual(
    parse("a[]=b&a[]&a[]=c&a[]=", { strictNullHandling: true, arrayLimit: 0 }),
    { a: ["b", null, "c", ""] },
    "with arrayLimit 0 + array brackets: null then empty string works"
  );

  assertEqual(
    parse("a[0]=b&a[1]=&a[2]=c&a[19]", {
      strictNullHandling: true,
      arrayLimit: 20
    }),
    { a: ["b", "", "c", null] },
    "with arrayLimit 20 + array indices: empty string then null works"
  );
  assertEqual(
    parse("a[]=b&a[]=&a[]=c&a[]", { strictNullHandling: true, arrayLimit: 0 }),
    { a: ["b", "", "c", null] },
    "with arrayLimit 0 + array brackets: empty string then null works"
  );

  assertEqual(
    parse("a[]=&a[]=b&a[]=c"),
    { a: ["", "b", "c"] },
    "array brackets: empty strings work"
  );
});

t("compacts sparse arrays", function() {
  assertEqual(parse("a[10]=1&a[2]=2", { arrayLimit: 20 }), { a: ["2", "1"] });
  assertEqual(parse("a[1][b][2][c]=1", { arrayLimit: 20 }), {
    a: [{ b: [{ c: "1" }] }]
  });
  assertEqual(parse("a[1][2][3][c]=1", { arrayLimit: 20 }), {
    a: [[[{ c: "1" }]]]
  });
  assertEqual(parse("a[1][2][3][c][1]=1", { arrayLimit: 20 }), {
    a: [[[{ c: ["1"] }]]]
  });
});

t("parses semi-parsed strings", function() {
  assertEqual(parse({ "a[b]": "c" }), { a: { b: "c" } });
  assertEqual(parse({ "a[b]": "c", "a[d]": "e" }), { a: { b: "c", d: "e" } });
});

// t('parses buffers correctly', function() {
//   const b = SaferBuffer.from('test')
//   assertEqual(parse({ a: b }), { a: b })
// })

t("parses jquery-param strings", function() {
  // readable = 'filter[0][]=int1&filter[0][]==&filter[0][]=77&filter[]=and&filter[2][]=int2&filter[2][]==&filter[2][]=8'
  const encoded =
    "filter%5B0%5D%5B%5D=int1&filter%5B0%5D%5B%5D=%3D&filter%5B0%5D%5B%5D=77&filter%5B%5D=and&filter%5B2%5D%5B%5D=int2&filter%5B2%5D%5B%5D=%3D&filter%5B2%5D%5B%5D=8";
  const expected = { filter: [["int1", "=", "77"], "and", ["int2", "=", "8"]] };
  assertEqual(parse(encoded), expected);
});

t("continues parsing when no parent is found", function() {
  assertEqual(parse("[]=&a=b"), { 0: "", a: "b" });
  assertEqual(parse("[]&a=b", { strictNullHandling: true }), {
    0: null,
    a: "b"
  });
  assertEqual(parse("[foo]=bar"), { foo: "bar" });
});

// t('does not error when parsing a very long array', function() {
//   const str = 'a[]=a'
//   while (Buffer.byteLength(str) < 128 * 1024) {
//     str = str + '&' + str
//   }

//   st.doesNotThrow(function() {
//     parse(str)
//   })
// })

t(
  "should not throw when a native prototype has an enumerable property",
  function() {
    Object.prototype["crash"] = "";
    Array.prototype["crash"] = "";
    parse.bind(null, "a=b");
    assertEqual(parse("a=b"), { a: "b" });
    parse.bind(null, "a[][b]=c");
    assertEqual(parse("a[][b]=c"), { a: [{ b: "c" }] });
    delete Object.prototype["crash"];
    delete Array.prototype["crash"];
  }
);

t("parses a string with an alternative string delimiter", function() {
  assertEqual(parse("a=b;c=d", { delimiter: ";" }), { a: "b", c: "d" });
});

t("parses a string with an alternative RegExp delimiter", function() {
  assertEqual(parse("a=b; c=d", { delimiter: /[;,] */ }), { a: "b", c: "d" });
});

t("does not use non-splittable objects as delimiters", function() {
  assertEqual(parse("a=b&c=d", { delimiter: true }), { a: "b", c: "d" });
});

t("allows overriding parameter limit", function() {
  assertEqual(parse("a=b&c=d", { parameterLimit: 1 }), { a: "b" });
});

t("allows setting the parameter limit to Infinity", function() {
  assertEqual(parse("a=b&c=d", { parameterLimit: Infinity }), {
    a: "b",
    c: "d"
  });
});

t("allows overriding array limit", function() {
  assertEqual(parse("a[0]=b", { arrayLimit: -1 }), { a: { 0: "b" } });
  assertEqual(parse("a[-1]=b", { arrayLimit: -1 }), { a: { "-1": "b" } });
  assertEqual(parse("a[0]=b&a[1]=c", { arrayLimit: 0 }), {
    a: { 0: "b", 1: "c" }
  });
});

t("allows disabling array parsing", function() {
  const indices = parse("a[0]=b&a[1]=c", { parseArrays: false });
  assertEqual(indices, { a: { 0: "b", 1: "c" } });
  assertEqual(
    Array.isArray(indices.a),
    false,
    "parseArrays:false, indices case is not an array"
  );

  const emptyBrackets = parse("a[]=b", { parseArrays: false });
  assertEqual(emptyBrackets, { a: { 0: "b" } });
  assertEqual(
    Array.isArray(emptyBrackets.a),
    false,
    "parseArrays:false, empty brackets case is not an array"
  );
});

t("allows for query string prefix", function() {
  assertEqual(parse("?foo=bar", { ignoreQueryPrefix: true }), { foo: "bar" });
  assertEqual(parse("foo=bar", { ignoreQueryPrefix: true }), { foo: "bar" });
  assertEqual(parse("?foo=bar", { ignoreQueryPrefix: false }), {
    "?foo": "bar"
  });
});

t("parses an object", function() {
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

  assertEqual(result, expected);
});

t("parses an object in dot notation", function() {
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

  assertEqual(result, expected);
});

t("parses an object and not child values", function() {
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

  assertEqual(result, expected);
});

// t('does not blow up when Buffer global is missing', function() {
//   const tempBuffer = global.Buffer
//   delete global.Buffer
//   const result = parse('a=b&c=d')
//   global.Buffer = tempBuffer
//   assertEqual(result, { a: 'b', c: 'd' })
// })

t("does not crash when parsing circular references", function() {
  const a = {};
  a["b"] = a;

  const parsed = parse({ "foo[bar]": "baz", "foo[baz]": a });

  assertEqual("foo" in parsed, true, 'parsed has "foo" property');
  assertEqual("bar" in parsed.foo, true);
  assertEqual("baz" in parsed.foo, true);
  assertEqual(parsed.foo.bar, "baz");
  assertEqual(parsed.foo.baz, a);
});

t("does not crash when parsing deep objects", function() {
  let parsed;
  let str = "foo";

  for (let i = 0; i < 5000; i++) {
    str += "[p]";
  }

  str += "=bar";

  parsed = parse(str, { depth: 5000 });

  assertEqual("foo" in parsed, true, 'parsed has "foo" property');

  let depth = 0;
  let ref = parsed.foo;
  while ((ref = ref.p)) {
    depth += 1;
  }

  assertEqual(depth, 5000, "parsed is 5000 properties deep");
});

t("parses null objects correctly", function() {
  const a = Object.create(null);
  a.b = "c";

  assertEqual(parse(a), { b: "c" });
  const result = parse({ a: a });
  assertEqual("a" in result, true, 'result has "a" property');
  assertEqual(result.a, a);
});

t("parses dates correctly", function() {
  const now = new Date();
  assertEqual(parse({ a: now }), { a: now });
});

t("parses regular expressions correctly", function() {
  const re = /^test$/;
  assertEqual(parse({ a: re }), { a: re });
});

t("does not allow overwriting prototype properties", function() {
  assertEqual(parse("a[hasOwnProperty]=b", { allowPrototypes: false }), {});
  assertEqual(parse("hasOwnProperty=b", { allowPrototypes: false }), {});

  assertEqual(
    parse("toString", { allowPrototypes: false }),
    {},
    'bare "toString" results in {}'
  );
});

t("can allow overwriting prototype properties", function() {
  assertEqual(parse("a[hasOwnProperty]=b", { allowPrototypes: true }), {
    a: { hasOwnProperty: "b" }
  });
  assertEqual(parse("hasOwnProperty=b", { allowPrototypes: true }), {
    hasOwnProperty: "b"
  });

  assertEqual(
    parse("toString", { allowPrototypes: true }),
    { toString: "" },
    'bare "toString" results in { toString: "" }'
  );
});

t("params starting with a closing bracket", function() {
  assertEqual(parse("]=toString"), { "]": "toString" });
  assertEqual(parse("]]=toString"), { "]]": "toString" });
  assertEqual(parse("]hello]=toString"), { "]hello]": "toString" });
});

t("params starting with a starting bracket", function() {
  assertEqual(parse("[=toString"), { "[": "toString" });
  assertEqual(parse("[[=toString"), { "[[": "toString" });
  assertEqual(parse("[hello[=toString"), { "[hello[": "toString" });
});

t("add keys to objects", function() {
  assertEqual(
    parse("a[b]=c&a=d"),
    { a: { b: "c", d: true } },
    "can add keys to objects"
  );

  assertEqual(
    parse("a[b]=c&a=toString"),
    { a: { b: "c" } },
    "can not overwrite prototype"
  );

  assertEqual(
    parse("a[b]=c&a=toString", { allowPrototypes: true }),
    { a: { b: "c", toString: true } },
    "can overwrite prototype with allowPrototypes true"
  );

  assertEqual(
    parse("a[b]=c&a=toString", { plainObjects: true }),
    { a: { b: "c", toString: true } },
    "can overwrite prototype with plainObjects true"
  );
});

t("can return null objects", function() {
  const expected = Object.create(null);
  expected.a = Object.create(null);
  expected.a.b = "c";
  expected.a.hasOwnProperty = "d";
  assertEqual(
    parse("a[b]=c&a[hasOwnProperty]=d", { plainObjects: true }),
    expected
  );
  assertEqual(parse(null, { plainObjects: true }), Object.create(null));
  const expectedArray = Object.create(null);
  expectedArray.a = Object.create(null);
  expectedArray.a[0] = "b";
  expectedArray.a.c = "d";
  assertEqual(parse("a[]=b&a[c]=d", { plainObjects: true }), expectedArray);
});

// t('can parse with custom encoding', function() {
//   assertEqual(
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
// })

t("receives the default decoder as a second argument", function() {
  parse("a", {
    decoder: function(str, defaultDecoder) {
      assertEqual(defaultDecoder, utils.decode);
      return "";
    }
  });
});

t("throws error with wrong decoder", function() {
  try {
    parse({}, { decoder: "string" as any });
  } catch (e) {
    assertEqual(e, new TypeError("Decoder has to be a function."));
  }
});

t("does not mutate the options argument", function() {
  const options = {};
  parse("a[b]=true", options);
  assertEqual(options, {});
});

t("throws if an invalid charset is specified", function() {
  try {
    parse("a=b", { charset: "foobar" });
  } catch (e) {
    assertEqual(
      e,
      new TypeError(
        "The charset option must be either utf-8, iso-8859-1, or undefined"
      )
    );
  }
});

t("parses an iso-8859-1 string if asked to", function() {
  assertEqual(parse("%A2=%BD", { charset: "iso-8859-1" }), { "¢": "½" });
});

const urlEncodedCheckmarkInUtf8 = "%E2%9C%93";
const urlEncodedOSlashInUtf8 = "%C3%B8";
const urlEncodedNumCheckmark = "%26%2310003%3B";
const urlEncodedNumSmiley = "%26%239786%3B";

t(
  "prefers an utf-8 charset specified by the utf8 sentinel to a default charset of iso-8859-1",
  function() {
    assertEqual(
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
);

t(
  "prefers an iso-8859-1 charset specified by the utf8 sentinel to a default charset of utf-8",
  function() {
    assertEqual(
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
);

t(
  "does not require the utf8 sentinel to be defined before the parameters whose decoding it affects",
  function() {
    assertEqual(
      parse("a=" + urlEncodedOSlashInUtf8 + "&utf8=" + urlEncodedNumCheckmark, {
        charsetSentinel: true,
        charset: "utf-8"
      }),
      { a: "Ã¸" }
    );
  }
);

t("should ignore an utf8 sentinel with an unknown value", function() {
  assertEqual(
    parse("utf8=foo&" + urlEncodedOSlashInUtf8 + "=" + urlEncodedOSlashInUtf8, {
      charsetSentinel: true,
      charset: "utf-8"
    }),
    { ø: "ø" }
  );
});

t(
  "uses the utf8 sentinel to switch to utf-8 when no default charset is given",
  function() {
    assertEqual(
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
);

t(
  "uses the utf8 sentinel to switch to iso-8859-1 when no default charset is given",
  function() {
    assertEqual(
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
);

t(
  "interprets numeric entities in iso-8859-1 when `interpretNumericEntities`",
  function() {
    assertEqual(
      parse("foo=" + urlEncodedNumSmiley, {
        charset: "iso-8859-1",
        interpretNumericEntities: true
      }),
      { foo: "☺" }
    );
  }
);

t(
  "handles a custom decoder returning `null`, in the `iso-8859-1` charset, when `interpretNumericEntities`",
  function() {
    assertEqual(
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
);

t(
  "does not interpret numeric entities in iso-8859-1 when `interpretNumericEntities` is absent",
  function() {
    assertEqual(
      parse("foo=" + urlEncodedNumSmiley, { charset: "iso-8859-1" }),
      { foo: "&#9786;" }
    );
  }
);

t(
  "does not interpret numeric entities when the charset is utf-8, even when `interpretNumericEntities`",
  function() {
    assertEqual(
      parse("foo=" + urlEncodedNumSmiley, {
        charset: "utf-8",
        interpretNumericEntities: true
      }),
      { foo: "&#9786;" }
    );
  }
);

t("does not interpret %uXXXX syntax in iso-8859-1 mode", function() {
  assertEqual(parse("%u263A=%u263A", { charset: "iso-8859-1" }), {
    "%u263A": "%u263A"
  });
});
