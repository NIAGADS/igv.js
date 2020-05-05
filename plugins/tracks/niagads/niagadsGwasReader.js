import igvxhr from "../../../js/igvxhr";

const NiagadsGwasReader = function (config) {
  this.config = config;
  this.url = config.url;
  this.indexed = false;
};

//required frunction
NiagadsGwasReader.prototype.readFeatures = async function (
  chr,
  bpStart,
  bpEnd
) {
  let self = this,
    queryChr = chr.startsWith("chr") ? chr : "chr" + chr,
    queryStart = Math.floor(bpStart),
    queryEnd = Math.ceil(bpEnd),
    queryURL =
      this.url +
      "?chromosome=" +
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

export default NiagadsGwasReader;
