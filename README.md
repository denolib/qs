# qs

[![Build Status](https://travis-ci.org/denolib/qs.svg?branch=master)](https://travis-ci.org/denolib/qs)

A querystring parsing and stringifying library with some added security.

The **qs** module was ported from https://github.com/ljharb/qs

## Usage

```ts
import {
  parse,
  stringify
} from "https://raw.githubusercontent.com/denolib/qs/master/index.ts";

const obj = parse("a=c"); // { a: "c" }
const str = stringify(obj); // a=c
```
