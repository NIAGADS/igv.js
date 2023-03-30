import TrackBase from "../../igv_src/js/trackBase.js";
import IGVGraphics from "../../igv_src/js/igv-canvas.js";
import { IGVMath } from "../../igv_src/node_modules/igv-utils/src/index";
import FeatureCache from "../../igv_src/node_modules/igv-utils/src/featureCache";
import GenomicInterval from "../../igv_src/js/genome/genomicInterval";
import MenuUtils from "../../igv_src/js/ui/menuUtils.js";
import { extend } from "../../igv_src/js/util/igvUtils.js";
import pack from "../../igv_src/js/feature/featurePacker";

import Reader from "../readers/GWASServiceReader";

const dataRangeMenuItem = MenuUtils.dataRangeMenuItem;

const GWASTrack = extend(
  TrackBase,

  function (config, browser) {
    var url = config.url,
      label = config.name;

    this.config = config;
    this.url = url;
    this.name = label;
    this.pValueField = config.pValueField || "pValue";
    this.geneField = config.geneField || "geneSymbol";
    this.snpField = config.snpField || "snp";

    const min = config.minLogP || config.min || 0;
    const max = config.maxLogP || config.max || 15;
    this.dataRange = {
      min: min || 1,
      max: max || 15,
    };

    this.autoscale = false;

    this.background = config.background; // No default
    this.divider = config.divider || "rgb(225,225,225)";
    this.dotSize = config.dotSize || 2;
    this.height = config.height || 100;
    this.autoHeight = false;
    this.disableButtons = config.disableButtons;

    // Limit visibility window to 2 mb,  gtex server gets flaky beyond that
    this.visibilityWindow =
      config.visibilityWindow === undefined
        ? 2000000
        : config.visibilityWindow >= 0
        ? Math.min(2000000, config.visibilityWindow)
        : 2000000;

    this.featureSource = new GWASFeatureSource(config, browser.genome);
  }
);

GWASTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {
  var track = this,
    yScale = (track.dataRange.max - track.dataRange.min) / pixelHeight;

  var font = {
    font: "normal 10px Arial",
    textAlign: "right",
    strokeStyle: "black",
  };

  IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {
    fillStyle: "rgb(255, 255, 255)",
  });

  // Determine a tick spacing such that there is at least 10 pixels between ticks

  var n = Math.ceil(
    ((this.dataRange.max - this.dataRange.min) * 10) / pixelHeight
  );

  for (var p = 4; p <= track.dataRange.max; p += n) {
    var x1, x2, y1, y2, ref;

    // TODO: Dashes may not actually line up with correct scale. Ask Jim about this

    ref = 0.85 * pixelWidth;
    x1 = ref - 5;
    x2 = ref;

    y1 = y2 = pixelHeight - Math.round((p - track.dataRange.min) / yScale);

    IGVGraphics.strokeLine(ctx, x1, y1, x2, y2, font); // Offset dashes up by 2 pixel

    if (y1 > 8) {
      IGVGraphics.fillText(ctx, p, x1 - 1, y1 + 2, font);
    } // Offset numbers down by 2 pixels;
  }

  font["textAlign"] = "center";

  IGVGraphics.fillText(
    ctx,
    "-log10(pvalue)",
    pixelWidth / 4,
    pixelHeight / 2,
    font,
    { rotate: { angle: -90 } }
  );
};

GWASTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
  const pValueField = this.pValueField;

  return this.featureSource
    .getFeatures(chr, bpStart, bpEnd)
    .then(function (features) {
      features.forEach(function (f) {
        f.value = f[pValueField];
      });
      return features;
    });
};

GWASTrack.prototype.draw = function (options) {
  var self = this,
    featureList = options.features,
    ctx = options.context,
    bpPerPixel = options.bpPerPixel,
    bpStart = options.bpStart,
    pixelWidth = options.pixelWidth,
    pixelHeight = options.pixelHeight,
    bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
    yScale = (self.dataRange.max - self.dataRange.min) / pixelHeight,
    selection = options.selection;

  // Background
  if (this.background)
    IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {
      fillStyle: this.background,
    });
  IGVGraphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {
    strokeStyle: this.divider,
  });

  if (ctx) {
    var len = featureList.length;

    ctx.save();

    // Draw in two passes, with "selected" eqtls drawn last
    drawGwas(false);
    drawGwas(true);

    ctx.restore();
  }

  function drawGwas(drawSelected) {

    var radius = drawSelected ? 2 * self.dotSize : self.dotSize,
      datum,
      i,
      px,
      py,
      color,
      isSelected,
      snp,
      geneName,
      capped;

    for (i = 0; i < len; i++) {
      datum = featureList[i];

      datum.position = datum.record_pk.split(":")[1];

      px = Math.round(datum.position - bpStart + 0.5) / bpPerPixel;
      if (px < 0) continue;
      else if (px > pixelWidth) break;

      snp = datum.variant;

      if (!drawSelected) {
        let mLogP = datum.neg_log10_pvalue;
        if (mLogP >= self.dataRange.min) {
          if (mLogP >= self.dataRange.max) {
            mLogP = self.dataRange.max;
            capped = true;
          } else {
            capped = false;
          }

          py = Math.max(
            0 + radius,
            pixelHeight - Math.round((mLogP - self.dataRange.min) / yScale)
          );
          datum.px = px;
          datum.py = py;

          if (drawSelected && selection) {
            color = selection.colorForGene(geneName);
            IGVGraphics.setProperties(ctx, {
              fillStyle: color,
              strokeStyle: "black",
            });
          } else {
            color =
              mLogP < 1.3
                ? "rgb(180, 180, 180)"
                : capped
                ? /* blue */ "rgb(16, 151, 230)"
                : getColor(mLogP, self.dataRange.max);
            IGVGraphics.setProperties(ctx, {
              fillStyle: color,
              strokeStyle: color,
            });
          }

          IGVGraphics.fillCircle(ctx, px, py, radius);
          IGVGraphics.strokeCircle(ctx, px, py, radius);
        }
      }
    }
  }
};

const getColor = (mLogP, maxVal) => {
  const bucketSize = maxVal / scale.length;

  const mScale = new Array(scale.length).fill(0).map((v, i) => i * bucketSize);

  let index;

  for (let i = 0; i < mScale.length; i++) {
    if (mScale[i] < mLogP) {
      continue;
    } else {
      index = i;
      break;
    }
  }
  return scale[index] || "rgb(180, 180, 180)";
};

const scale = [
  "#a50026",
  "#a70226",
  "#a90426",
  "#ab0626",
  "#ad0826",
  "#af0926",
  "#b10b26",
  "#b30d26",
  "#b50f26",
  "#b61127",
  "#b81327",
  "#ba1527",
  "#bc1727",
  "#be1927",
  "#c01b27",
  "#c21d28",
  "#c41f28",
  "#c52128",
  "#c72328",
  "#c92529",
  "#cb2729",
  "#cc2929",
  "#ce2b2a",
  "#d02d2a",
  "#d12f2b",
  "#d3312b",
  "#d4332c",
  "#d6352c",
  "#d7382d",
  "#d93a2e",
  "#da3c2e",
  "#dc3e2f",
  "#dd4030",
  "#de4331",
  "#e04532",
  "#e14733",
  "#e24a33",
  "#e34c34",
  "#e44e35",
  "#e55136",
  "#e75337",
  "#e85538",
  "#e95839",
  "#ea5a3a",
  "#eb5d3c",
  "#ec5f3d",
  "#ed613e",
  "#ed643f",
  "#ee6640",
  "#ef6941",
  "#f06b42",
  "#f16e43",
  "#f17044",
  "#f27346",
  "#f37547",
  "#f37848",
  "#f47a49",
  "#f57d4a",
  "#f57f4b",
  "#f6824d",
  "#f6844e",
  "#f7864f",
  "#f78950",
  "#f88b51",
  "#f88e53",
  "#f89054",
  "#f99355",
  "#f99556",
  "#f99858",
  "#fa9a59",
  "#fa9c5a",
  "#fa9f5b",
  "#fba15d",
  "#fba35e",
  "#fba660",
  "#fba861",
  "#fcaa62",
  "#fcad64",
  "#fcaf65",
  "#fcb167",
  "#fcb368",
  "#fcb56a",
  "#fdb86b",
  "#fdba6d",
  "#fdbc6e",
  "#fdbe70",
  "#fdc071",
  "#fdc273",
  "#fdc474",
  "#fdc676",
  "#fdc878",
  "#fdca79",
  "#fecc7b",
  "#fecd7d",
  "#fecf7e",
  "#fed180",
  "#fed382",
  "#fed584",
  "#fed685",
  "#fed887",
  "#feda89",
  "#fedb8b",
  "#fedd8d",
  "#fede8f",
  "#fee090",
  "#fee192",
  "#fee394",
  "#fee496",
  "#fee698",
  "#fee79a",
  "#fee89b",
  "#feea9d",
  "#feeb9f",
  "#feeca0",
  "#feeda2",
  "#feeea3",
  "#fdefa5",
  "#fdf0a6",
  "#fdf1a7",
  "#fdf2a9",
  "#fcf3aa",
  "#fcf4ab",
  "#fcf5ab",
  "#fbf5ac",
  "#fbf6ad",
  "#faf6ad",
  "#faf7ad",
  "#f9f7ae",
  "#f8f7ae",
  "#f7f8ad",
  "#f7f8ad",
  "#f6f8ad",
  "#f5f8ac",
  "#f4f8ab",
  "#f3f8ab",
  "#f1f8aa",
  "#f0f7a9",
  "#eff7a8",
  "#eef7a6",
  "#edf6a5",
  "#ebf6a4",
  "#eaf6a2",
  "#e8f5a1",
  "#e7f59f",
  "#e6f49d",
  "#e4f39c",
  "#e2f39a",
  "#e1f298",
  "#dff297",
  "#def195",
  "#dcf093",
  "#daef92",
  "#d9ef90",
  "#d7ee8e",
  "#d5ed8d",
  "#d3ec8b",
  "#d2ec89",
  "#d0eb88",
  "#ceea86",
  "#cce985",
  "#cae983",
  "#c8e882",
  "#c6e780",
  "#c4e67f",
  "#c2e57e",
  "#c0e47c",
  "#bee47b",
  "#bce37a",
  "#bae279",
  "#b8e178",
  "#b6e076",
  "#b4df75",
  "#b2de74",
  "#b0dd73",
  "#aedc72",
  "#acdb71",
  "#a9da70",
  "#a7d970",
  "#a5d86f",
  "#a3d86e",
  "#a0d76d",
  "#9ed66c",
  "#9cd56c",
  "#99d36b",
  "#97d26b",
  "#95d16a",
  "#92d069",
  "#90cf69",
  "#8ece68",
  "#8bcd68",
  "#89cc67",
  "#86cb67",
  "#84ca66",
  "#81c966",
  "#7fc866",
  "#7cc665",
  "#79c565",
  "#77c464",
  "#74c364",
  "#71c263",
  "#6fc063",
  "#6cbf62",
  "#69be62",
  "#67bd62",
  "#64bc61",
  "#61ba60",
  "#5eb960",
  "#5cb85f",
  "#59b65f",
  "#56b55e",
  "#53b45e",
  "#51b25d",
  "#4eb15c",
  "#4baf5c",
  "#48ae5b",
  "#46ad5a",
  "#43ab5a",
  "#40aa59",
  "#3da858",
  "#3ba757",
  "#38a557",
  "#36a456",
  "#33a255",
  "#31a154",
  "#2e9f54",
  "#2c9d53",
  "#2a9c52",
  "#289a51",
  "#259950",
  "#23974f",
  "#21954f",
  "#1f944e",
  "#1e924d",
  "#1c904c",
  "#1a8f4b",
  "#188d4a",
  "#178b49",
  "#158948",
  "#148747",
  "#128646",
  "#118446",
  "#108245",
  "#0e8044",
  "#0d7e43",
  "#0c7d42",
  "#0b7b41",
  "#0a7940",
  "#08773f",
  "#07753e",
  "#06733d",
  "#05713c",
  "#04703b",
  "#036e3a",
  "#026c39",
  "#016a38",
  "#006837",
];

/**
 * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
 */
GWASTrack.prototype.popupData = function (config) {
  let features = config.viewport.getCachedFeatures();
  if (!features || features.length === 0) return [];

  let genomicLocation = config.genomicLocation,
    xOffset = config.x,
    yOffset = config.y,
    referenceFrame = config.viewport.referenceFrame,
    tolerance = 2 * this.dotSize * referenceFrame.bpPerPixel,
    dotSize = this.dotSize,
    track = this.name,
    popupData = [];

  features.forEach(function (feature) {
    if (
      feature.end >= genomicLocation - tolerance &&
      feature.start <= genomicLocation + tolerance &&
      feature.py - yOffset < 2 * dotSize
    ) {
      if (popupData.length > 0) {
        popupData.push("<hr>");
      }

      popupData.push(
        { name: "variant", value: feature.variant },
        { name: "p value", value: feature.pvalue },
        { name: "track", value: track }
      );
    }
  });
  return popupData;
};

GWASTrack.prototype.menuItemList = function () {
  var self = this,
    menuItems = [];

  menuItems.push(dataRangeMenuItem(this.trackView));

  return menuItems;
};

GWASTrack.prototype.doAutoscale = function (featureList) {
  if (featureList.length > 0) {
    var values = featureList.map(function (datum) {
      return datum.neg_log10_pvalue;
    });

    this.dataRange.max = IGVMath.percentile(values, this.autoscalePercentile);
  } else {
    // No features -- default
    const max = this.config.maxLogP || this.config.max;
    this.dataRange.max = max || 25;
  }

  return this.dataRange;
};

export default GWASTrack;

class GWASFeatureSource {
  constructor(config, genome) {
    this.config = config || {};
    this.genome = genome;

    this.reader = new Reader(config);
    this.queryable = true;
    this.expandQuery = config.expandQuery ? true : false;
  }

  async getFeatures(chr, bpStart, bpEnd, _, visibilityWindow) {
    const reader = this.reader;
    const genome = this.genome;
    const queryChr = genome ? genome.getChromosomeName(chr) : chr;
    const featureCache = await getFeatureCache.call(this);
    const isQueryable = this.queryable;

    if ("all" === chr.toLowerCase()) {
      // queryable sources don't support whole genome view
      return [];
    } else {
      return featureCache.queryFeatures(queryChr, bpStart, bpEnd);
    }

    async function getFeatureCache() {
      let intervalStart = bpStart;
      let intervalEnd = bpEnd;
      let genomicInterval = new GenomicInterval(
        queryChr,
        intervalStart,
        intervalEnd
      );

      if (
        this.featureCache &&
        (this.static ||
          this.featureCache.containsRange(genomicInterval) ||
          "all" === chr.toLowerCase())
      ) {
        return this.featureCache;
      } else {
        // Use visibility window to potentially expand query interval.
        // This can save re-queries as we zoom out.  Visibility window <= 0 is a special case
        // indicating whole chromosome should be read at once.
        if (
          (!visibilityWindow || visibilityWindow <= 0) &&
          this.expandQuery !== false
        ) {
          // Whole chromosome
          intervalStart = 0;
          intervalEnd = Number.MAX_SAFE_INTEGER;
        } else if (
          visibilityWindow > bpEnd - bpStart &&
          this.expandQuery !== false
        ) {
          const expansionWindow = Math.min(
            4.1 * (bpEnd - bpStart),
            visibilityWindow
          );
          intervalStart = Math.max(0, (bpStart + bpEnd - expansionWindow) / 2);
          intervalEnd = bpStart + expansionWindow;
        }
        genomicInterval = new GenomicInterval(
          queryChr,
          intervalStart,
          intervalEnd
        );

        let featureList = await reader.readFeatures(
          queryChr,
          genomicInterval.start,
          genomicInterval.end
        );
        if (this.queryable === undefined) {
          this.queryable = reader.indexed;
        }

        if (featureList) {
          this.ingestFeatures(featureList, genomicInterval);
        } else {
          this.featureCache = new FeatureCache(); // Empty cache
        }
        return this.featureCache;
      }
    }
  }

  ingestFeatures(featureList, genomicInterval) {
    // Assign overlapping features to rows
    const maxRows = this.config.maxRows || 500;
    packFeatures(featureList, maxRows);

    //i think building this tree is what's causing problems
    this.featureCache = new FeatureCache(
      featureList,
      this.genome,
      genomicInterval
    );
  }
}

function packFeatures(features, maxRows) {
  maxRows = maxRows || 1000;
  if (features == null || features.length === 0) {
    return;
  }

  // Segregate by chromosome
  var chrFeatureMap = {},
    chrs = [];
  features.forEach(function (feature) {
    var chr = feature.chr,
      flist = chrFeatureMap[chr];

    if (!flist) {
      flist = [];
      chrFeatureMap[chr] = flist;
      chrs.push(chr);
    }

    flist.push(feature);
  });

  // Loop through chrosomosomes and pack features;

  chrs.forEach(function (chr) {
    pack(chrFeatureMap[chr], maxRows);
  });
}
