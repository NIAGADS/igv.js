// Defines the top-level API for the igv module

import MenuUtils from "./ui/menuUtils.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import IGVGraphics from "./igv-canvas.js";
import { createCheckbox } from "./igv-icons.js";
import {
  createBrowser,
  createTrack,
  removeAllBrowsers,
  removeBrowser,
  visibilityChange,
} from "./igv-create.js";
import { doAutoscale } from "./util/igvUtils.js";
import embedCss from "./embedCss.js";
import version from "./version.js";
import TrackView from "./trackView.js";
import {
  igvxhr,
  oauth,
  IGVMath,
  FeatureCache,
  FileUtils,
  IGVColor,
  StringUtils
} from "../node_modules/igv-utils/src/index.js";

import GenomicInterval from "./genome/genomicInterval";
import featurePacker from "./feature/featurePacker";
import FeatureSource from "./feature/featureSource";
import TrackBase from "../js/trackBase.js";
import {BinnedColorScale, ConstantColorScale, GradientColorScale} from "./util/colorScale.js"
import {randomColor as randomColorPalette, ColorTable, PaletteColorTable, appleCrayonPalette} from "./util/colorPalletes";
import { makeVCFChords} from "./jbrowse/circularViewUtils";

const setApiKey = igvxhr.setApiKey;

embedCss();

function setGoogleOauthToken(accessToken) {
  return oauth.setToken(accessToken);
}

function setOauthToken(accessToken, host) {
  return oauth.setToken(accessToken, host);
}

export default {
  IGVGraphics,
  MenuUtils,
  DataRangeDialog,
  createTrack,
  createBrowser,
  removeBrowser,
  removeAllBrowsers,
  visibilityChange,
  setGoogleOauthToken,
  setOauthToken,
  oauth,
  version,
  setApiKey,
  doAutoscale,
  TrackView,
  featurePacker,
  igvxhr,
  FeatureCache,
  IGVMath,
  GenomicInterval,
  TrackBase,
  BinnedColorScale,
  ConstantColorScale,
  GradientColorScale,
  randomColorPalette,
  ColorTable, 
  PaletteColorTable,
  makeVCFChords,
  FeatureSource,
  FileUtils,
  IGVColor,
  StringUtils,
  createCheckbox,
  appleCrayonPalette
};
