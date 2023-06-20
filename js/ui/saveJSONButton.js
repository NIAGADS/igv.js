import {DOMUtils} from '../../node_modules/igv-utils/src/index.js'
import { FileUtils } from '../../node_modules/igv-utils/src/index.js'

const SaveJSONButton = function (parent, browser) {
    const button = DOMUtils.div({class: 'igv-navbar-button'})
    parent.append(button)

    button.textContent = 'Save JSON'
    button.addEventListener('click', () => downloadJSONFile(browser.toJSON()));
}

const downloadJSONFile = (json) => {
    const path = 'igvjs.json'
    const dataStr = JSON.stringify(json)
    const data = URL.createObjectURL(new Blob([dataStr], {type: "application/octet-stream"}))
    FileUtils.download(path, data)
}

export default SaveJSONButton
