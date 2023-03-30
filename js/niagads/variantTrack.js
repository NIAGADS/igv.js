/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
 * Author: Jim Robinson
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


//todo: write this in typescript

import TrackBase from "../../igv_src/js/trackBase.js";
import IGVGraphics from "../../igv_src/js/igv-canvas.js";
import FeatureCache from "../../igv_src/node_modules/igv-utils/src/featureCache";
import GenomicInterval from "../../igv_src/js/genome/genomicInterval";
import MenuUtils from "../../igv_src/js/ui/menuUtils.js";
import { createCheckbox } from "../../igv_src/js/igv-icons.js";

import pack from "../../igv_src/js/feature/featurePacker";

import Reader from "../readers/VariantServiceReader";

const dataRangeMenuItem = MenuUtils.dataRangeMenuItem;
const DEFAULT_VISIBILITY_WINDOW = 1000000;
const type = "variant";
const topMargin = 10;

class VariantTrack extends TrackBase {
  constructor(config, browser) {
    super(config, browser);

    this.type = type;

    this.visibilityWindow = config.visibilityWindow;

    this.displayMode = config.displayMode || "EXPANDED"; // COLLAPSED | EXPANDED | SQUISHED
    this.labelDisplayMode = config.labelDisplayMode;
    this.variantHeight = config.variantHeight || 10;
    this.squishedCallHeight = config.squishedCallHeight || 1;
    this.expandedCallHeight = config.expandedCallHeight || 10;
    this.expandedVGap =
      config.expandedVGap !== undefined ? config.expandedVGap : 2;
    this.squishedVGap =
      config.squishedVGap !== undefined ? config.squishedVGap : 1;
    this.expandedGroupGap = config.expandedGroupGap || 10;
    this.squishedGroupGap = config.squishedGroupGap || 5;
    this.featureHeight = config.featureHeight || 14;
    this.visibilityWindow = config.visibilityWindow;

    this.featureSource = new VariantFeatureSource(
      config,
      browser.genome
    );

    this.noCallColor = config.noCallColor || "rgb(245, 245, 245)";
    this.nonRefColor = config.nonRefColor || "rgb(200, 200, 215)";
    this.mixedColor = config.mixedColor || "rgb(200, 220, 200)";
    this.homrefColor = config.homrefColor || "rgb(200, 200, 200)";
    this.homvarColor = config.homvarColor || "rgb(17,248,254)";
    this.hetvarColor = config.hetvarColor || "rgb(34,12,253)";

    this.sortDirection = "ASC";

    this.nRows = 1; // Computed dynamically

    this.impactScale = {
      high: "#ff00ff",
      moderate: "gold",
      low: "green",
      modifier: "#669",
      not_reported: "black",
    };
  }

  popupData(clickState, featureList) {
    if (!featureList) featureList = this.clickedFeatures(clickState);

    const genomicLocation = clickState.genomicLocation,
      genomeID = this.browser.genome.id,
      popupData = [],
      sampleInformation = this.browser.sampleInformation;

    for (let variant of featureList) {
      if (popupData.length > 0) {
        popupData.push("<HR>");
      }

      if ("COLLAPSED" === this.displayMode) {
        Array.prototype.push.apply(
          popupData,
          variant.popupData(genomicLocation, this.type)
        );
      } else {
        const yOffset = clickState.y;
        const vGap =
          this.displayMode === "EXPANDED"
            ? this.expandedVGap
            : this.squishedVGap;

        if (yOffset <= this.variantBandHeight) {
          // Variant
          const row = Math.floor(
            (yOffset - topMargin) / (this.variantHeight + vGap)
          );
          if (variant.row === row) {
            //todo: when building for genomics db, transform `record` field into nav link to record page
            let fields = variant.popupData(genomicLocation, genomeID);
            fields = fields.map((f) =>
              typeof f === "string"
                ? f
                : {
                    ...f,
                    value:
                      f.name === "record"
                        ? `<a href="#" title="todo: link to genomicsDB page">${f.value}</a>`
                        : f.value,
                  }
            );
            Array.prototype.push.apply(popupData, fields, this.type);
          }
        } else {
          // Genotype
          // todo: i think this code can go

          const callSets = this.callSets;
          if (callSets && variant.calls) {
            const callHeight =
              this.nRows *
              ("SQUISHED" === this.displayMode
                ? this.squishedCallHeight
                : this.expandedCallHeight);
            const row = Math.floor(
              (yOffset - this.variantBandHeight) / (callHeight + vGap)
            );
            if (row >= 0 && row < callSets.length) {
              const cs = callSets[row];
              const call = variant.calls[cs.id];
              Array.prototype.push.apply(
                popupData,
                extractGenotypePopupData(
                  call,
                  variant,
                  genomeID,
                  sampleInformation
                )
              );
            }
          }
        }
      }
    }

    return popupData;
  }

  getFeatures(chr, bpStart, bpEnd) {
    return this.featureSource.getFeatures(chr, bpStart, bpEnd);
  }

  draw(options) {
    const ctx = options.context,
      callSets = [], //this.callSets //todo: figure this out
      nCalls = this.getCallsetsLength(),
      pixelWidth = options.pixelWidth,
      pixelHeight = options.pixelHeight,
      callHeight =
        "EXPANDED" === this.displayMode
          ? this.expandedCallHeight
          : this.squishedCallHeight,
      bpPerPixel = options.bpPerPixel,
      bpStart = options.bpStart,
      bpEnd = bpStart + pixelWidth * bpPerPixel + 1;

    IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {
      fillStyle: "rgb(255, 255, 255)",
    });

    const vGap =
      this.displayMode === "EXPANDED" ? this.expandedVGap : this.squishedVGap;

    if (callSets && nCalls > 0 && "COLLAPSED" !== this.displayMode) {
      IGVGraphics.strokeLine(
        ctx,
        0,
        this.variantBandHeight,
        pixelWidth,
        this.variantBandHeight,
        { strokeStyle: "rgb(224,224,224) " }
      );
    }

    const featureList = options.features;

    if (featureList) {
      for (let variant of featureList) {
        if (variant.end < bpStart) continue;
        if (variant.start > bpEnd) break;

        const py =
          topMargin +
          ("COLLAPSED" === this.displayMode
            ? 0
            : variant.row * (this.variantHeight + vGap));
        const vh = this.variantHeight;

        // Compute pixel width.   Minimum width is 3 pixels,  if > 5 pixels create gap between variants
        let px = Math.round((variant.start - bpStart) / bpPerPixel);
        let px1 = Math.round((variant.end - bpStart) / bpPerPixel);
        let pw = Math.max(1, px1 - px);
        if (pw < 3) {
          pw = 3;
          px -= 1;
        } else if (pw > 5) {
          px += 1;
          pw -= 2;
        }

        //not using these, all are converted to type OTHER by variant constructor, i think
        if ("NONVARIANT" === variant.type) {
          ctx.fillStyle = this.nonRefColor;
        } else if ("MIXED" === variant.type) {
          ctx.fillStyle = this.mixedColor;
        } else {
          ctx.fillStyle = this.impactScale[getImpact(variant.info)];
        }

        ctx.fillRect(px, py, pw, vh);

        if (nCalls > 0 && variant.calls && "COLLAPSED" !== this.displayMode) {
          let callsDrawn = 0;

          for (let callSet of callSets) {
            const call = variant.calls[callSet.id];
            if (call) {
              const py =
                this.variantBandHeight +
                vGap +
                (callsDrawn + variant.row) * (callHeight + vGap);
              let allVar = true; // until proven otherwise
              let allRef = true;
              let noCall = false;
              for (let g of call.genotype) {
                if ("." === g) {
                  noCall = true;
                  break;
                } else {
                  if (g !== 0) allRef = false;
                  if (g === 0) allVar = false;
                }
              }

              if (noCall) {
                ctx.fillStyle = this.noCallColor;
              } else if (allRef) {
                ctx.fillStyle = this.homrefColor;
              } else if (allVar) {
                ctx.fillStyle = this.homvarColor;
              } else {
                ctx.fillStyle = this.hetvarColor;
              }

              ctx.fillRect(px, py, pw, callHeight);
            }
            callsDrawn++;
          }
        }
      }
    } else {
      console.log("No feature list");
    }
  }

  computePixelHeight(features) {
    if (this.displayMode === "COLLAPSED") {
      this.nRows = 1;
      return topMargin + this.variantHeight;
    } else {
      var maxRow = 0;
      if (features) {
        for (let feature of features) {
          if (feature.row && feature.row > maxRow) maxRow = feature.row;
        }
      }
      const vGap =
        this.displayMode === "EXPANDED" ? this.expandedVGap : this.squishedVGap;
      this.nRows = maxRow + 1;
      const h = topMargin + this.nRows * (this.variantHeight + vGap);
      this.variantBandHeight = h;

      const callHeight =
        this.displayMode === "EXPANDED"
          ? this.expandedCallHeight
          : this.squishedCallHeight;
      const nCalls = this.getCallsetsLength() * this.nRows;
      return h + vGap + (nCalls + 1) * (callHeight + vGap);
    }
  }

  //todo: is this needed?
  getCallsetsLength() {
    return 0;
  }

  menuItemList() {
    var self = this,
      menuItems = [],
      mapped;

    const div = document.createElement("div");
    div.className = "igv-track-menu-border-top";
    menuItems.push({
      object: div,
    });

    ["COLLAPSED", "SQUISHED", "EXPANDED"].forEach(function (displayMode) {
      var lut = {
        COLLAPSED: "Collapse",
        SQUISHED: "Squish",
        EXPANDED: "Expand",
      };

      menuItems.push({
        object: createCheckbox(
          lut[displayMode],
          displayMode === self.displayMode
        ),
        click: function () {
          self.displayMode = displayMode;
          self.trackView.checkContentHeight();
          self.trackView.repaintViews();
        },
      });
    });

    return menuItems;
  }
}

/**
 * Genotype popup text.
 * @param call
 * @param variant
 * @returns {Array}
 */
function extractGenotypePopupData(call, variant, genomeId, sampleInformation) {
  let gt = "";
  const altArray = variant.alternateBases.split(",");
  for (let allele of call.genotype) {
    if ("." === allele) {
      gt += "No Call";
      break;
    } else if (allele === 0) {
      gt += variant.referenceBases;
    } else {
      let alt = altArray[allele - 1].replace("<", "&lt;");
      gt += alt;
    }
  }

  let popupData = [];
  if (call.callSetName !== undefined) {
    popupData.push({ name: "Name", value: call.callSetName });
  }
  popupData.push({ name: "Genotype", value: gt });
  if (call.phaseset !== undefined) {
    popupData.push({ name: "Phase set", value: call.phaseset });
  }
  if (call.genotypeLikelihood !== undefined) {
    popupData.push({
      name: "genotypeLikelihood",
      value: call.genotypeLikelihood.toString(),
    });
  }

  if (sampleInformation) {
    var attr = sampleInformation.getAttributes(call.callSetName);
    if (attr) {
      Object.keys(attr).forEach(function (attrName) {
        var displayText = attrName.replace(/([A-Z])/g, " $1");
        displayText =
          displayText.charAt(0).toUpperCase() + displayText.slice(1);
        popupData.push({ name: displayText, value: attr[attrName] });
      });
    }
  }

  var infoKeys = Object.keys(call.info);
  if (infoKeys.length) {
    popupData.push("<hr>");
  }
  infoKeys.forEach(function (key) {
    popupData.push({ name: key, value: call.info[key] });
  });

  let cravatLinks = []; // TODO -- where do these get calculated?
  if (cravatLinks.length > 0) {
    popupData.push("<HR/>");
    popupData = popupData.concat(cravatLinks);
  }

  return popupData;
}

export default VariantTrack;

class VariantFeatureSource {
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

  // Loop through chromosomes and pack features;

  chrs.forEach(function (chr) {
    pack(chrFeatureMap[chr], maxRows);
  });
}

const getImpact = (info) =>
  info && info.impact ? info.impact.toLowerCase() : "not_reported";
