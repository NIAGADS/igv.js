import * as TrackUtils from "./util/trackUtils.js"

import { BinnedColorScale, ConstantColorScale, GradientColorScale } from "./util/colorScale.js";
import {
    ColorTable,
    PaletteColorTable,
    appleCrayonPalette,
    randomColor as randomColorPalette,
} from "./util/colorPalletes";
import { FeatureCache, FileUtils, IGVColor, IGVMath, StringUtils } from "../node_modules/igv-utils/src/index.js"
import { createBrowser, createTrack, removeAllBrowsers, removeBrowser, visibilityChange } from './igv-create.js'
import { registerTrackClass, registerTrackCreatorFunction } from "./trackFactory.js"

import BWReader from "./bigwig/bwReader.js";
import Browser from "./browser.js"
import DataRangeDialog from "./ui/dataRangeDialog.js"
import FeatureFileReader from "./feature/featureFileReader.js";
import FeatureSource from "./feature/featureSource";
import GenomicInterval from "./genome/genomicInterval";
import Hub from "./ucsc/ucscHub.js"
import IGVGraphics from "./igv-canvas.js"
// Defines the top-level API for the igv module
import MenuUtils from "./ui/menuUtils.js"
import TrackBase from "./trackBase.js"
import TrackView from "./trackView.js";
// Added for NIAGADS custom tracks and decoders
import { createCheckbox } from "./igv-icons.js";
import { doAutoscale } from "./util/igvUtils.js";
import embedCss from "./embedCss.js"
import featurePacker from "./feature/featurePacker";
import { igvxhr } from "../node_modules/igv-utils/src/index.js"
import { makeVCFChords } from "./jbrowse/circularViewUtils";
import { registerFileFormats } from "./util/fileFormats.js"
import version from "./version.js"

const setApiKey = igvxhr.setApiKey

function setGoogleOauthToken(accessToken) {
    return igvxhr.setOauthToken(accessToken)
}

function setOauthToken(accessToken, host) {
    return igvxhr.setOauthToken(accessToken, host)
}

// Backward compatibility
const oauth = igvxhr.oauth

export default {
    TrackUtils,
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
    TrackBase,
    registerTrackClass,
    registerTrackCreatorFunction,
    registerFileFormats,
    loadSessionFile: Browser.loadSessionFile,

    // added by NIAGADS
    igvxhr,
    embedCss,
    createCheckbox,
    doAutoscale,
    TrackView,
    IGVMath,
    FeatureCache,
    FileUtils,
    IGVColor,
    StringUtils,
    GenomicInterval,
    featurePacker,
    FeatureSource,
    BinnedColorScale,
    ConstantColorScale,
    GradientColorScale,
    randomColorPalette,
    ColorTable,
    PaletteColorTable,
    appleCrayonPalette,
    makeVCFChords,
    FeatureFileReader,
    BWReader
}

