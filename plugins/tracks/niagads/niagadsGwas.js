/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

import TrackBase from "../../../js/trackBase.js";
import IGVGraphics from "../../../js/igv-canvas.js";
import IGVMath from "../../../js/igv-math.js";
import FeatureCache from "../../../js/feature/featureCache";
import GenomicInterval from "../../../js/genome/genomicInterval";
import MenuUtils from "../../../js/ui/menuUtils.js";
import Reader from "./niagadsGwasReader";
import { createCheckbox } from "../../../js/igv-icons.js";
import { extend } from "../../../js/util/igvUtils.js";
import pack from "./../../../js/feature/featurePacker";

const dataRangeMenuItem = MenuUtils.dataRangeMenuItem;

const NiagadsGWASTrack = extend(
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

    const min = config.minLogP || config.min;
    const max = config.maxLogP || config.max;
    this.dataRange = {
      min: min || 1,
      max: max || 25,
    };
    if (!max) {
      this.autoscale = true;
    } else {
      this.autoscale = config.autoscale;
    }
    this.autoscalePercentile =
      config.autoscalePercentile === undefined
        ? 98
        : config.autoscalePercentile;

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

    this.featureSource = new NiagadsGWASFeatureSource(config, browser.genome);
  }
);

NiagadsGWASTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {
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

NiagadsGWASTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
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

NiagadsGWASTrack.prototype.draw = function (options) {
  var self = this,
    featureList = options.features,
    ctx = options.context,
    bpPerPixel = options.bpPerPixel,
    bpStart = options.bpStart,
    pixelWidth = options.pixelWidth,
    pixelHeight = options.pixelHeight,
    bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
    yScale = (self.dataRange.max - self.dataRange.min) / pixelHeight,
    selection = options.genomicState.selection;

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
    drawNiagadsGwas(false);
    drawNiagadsGwas(true);

    ctx.restore();
  }

  function drawNiagadsGwas(drawSelected) {
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
        // Add datum's gene to the selection if this is the selected snp.
        // TODO -- this should not be done here in the rendering code.
        /* if (selection && selection.snp === snp) {
          selection.addGene(geneName);
        } */

        var mLogP = datum.neg_log10_pvalue;
        if (mLogP >= self.dataRange.min) {
          if (mLogP > self.dataRange.max) {
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
            color = capped ? "rgb(150, 150, 150)" : "rgb(180, 180, 180)";
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

/**
 * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
 */
NiagadsGWASTrack.prototype.popupData = function (config) {
  let features = config.viewport.getCachedFeatures();
  if (!features || features.length === 0) return [];

  let genomicLocation = config.genomicLocation,
    xOffset = config.x,
    yOffset = config.y,
    referenceFrame = config.viewport.genomicState.referenceFrame,
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

NiagadsGWASTrack.prototype.menuItemList = function () {
  var self = this,
    menuItems = [];

  menuItems.push(dataRangeMenuItem(this.trackView));

  menuItems.push({
    object: createCheckbox("Autoscale", self.autoscale),
    click: function () {
      self.autoscale = !self.autoscale;
      self.config.autoscale = self.autoscale;
      self.trackView.setDataRange(undefined, undefined, self.autoscale);
    },
  });

  return menuItems;
};

NiagadsGWASTrack.prototype.doAutoscale = function (featureList) {
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

export default NiagadsGWASTrack;

class NiagadsGWASFeatureSource {
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
    if (this.config.format !== "wig" && this.config.type !== "junctions") {
      const maxRows = this.config.maxRows || 500;
      packFeatures(featureList, maxRows);
    }

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
