/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 UC San Diego
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { igvxhr } from "../../node_modules/igv-utils/src/index.js";

const GwasServiceReader = function (config) {
  this.config = config;
  this.endpoint = config.endpoint;
  this.indexed = false;
  this.track = config.track;
};

//required frunction
GWASServiceReader.prototype.readFeatures = async function (
  chr,
  bpStart,
  bpEnd
) {
  let self = this,
    queryChr = chr.startsWith("chr") ? chr : "chr" + chr,
    queryStart = Math.floor(bpStart),
    queryEnd = Math.ceil(bpEnd),
    queryURL =
      this.endpoint +
      "?track=" +
      this.track +
      "&chromosome=" +
      queryChr +
      "&start=" +
      queryStart +
      "&end=" +
      queryEnd;
  const json = await igvxhr.loadJson(queryURL, {
    withCredentials: self.config.withCredentials,
  });
  if (json && json.data) {
    return json.data.map((item) => {
      const pos = item.record_pk.split(":")[1];
      return {
        ...item,
        start: pos - 1,
        end: pos,
        chr, //needed by cache
      };
    });
  } else {
    return undefined;
  }
};

export default GWASServiceReader;
