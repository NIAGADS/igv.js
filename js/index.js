// Defines the top-level API for the igv module

import MenuUtils from "./ui/menuUtils.js"
import DataRangeDialog from "./ui/dataRangeDialog.js"
import IGVGraphics from "./igv-canvas.js"
import { createCheckbox } from "./igv-icons.js"; // TODO: NIAGADS not sure if this is needed
import { doAutoscale } from "./util/igvUtils.js";
import {createBrowser, createTrack, removeAllBrowsers, removeBrowser, visibilityChange} from './igv-create.js'
import embedCss from "./embedCss.js"
import version from "./version.js"
import TrackView from "./trackView.js";
import * as TrackUtils from "./util/trackUtils.js"
import {registerFileFormats} from "./util/trackUtils.js"
import {igvxhr,
        IGVMath,
  FeatureCache,
  FileUtils,
  IGVColor,
  StringUtils
       } from "../node_modules/igv-utils/src/index.js"
import {registerTrackClass, registerTrackCreatorFunction} from "./trackFactory.js"
import TrackBase from "./trackBase.js"
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
    return igvxhr.setOauthToken(accessToken)
}

function setOauthToken(accessToken, host) {
    return igvxhr.setOauthToken(accessToken, host)
}

// Backward compatibility
const oauth = igvxhr.oauth

export default {T

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
  appleCrayonPalette,
      TrackUtils,
    registerTrackClass,
    registerTrackCreatorFunction,
    registerFileFormats

}


