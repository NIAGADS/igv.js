import {DOMUtils} from '../../node_modules/igv-utils/src/index.js'

const SaveJSONButton = function (parent, browser) {
    const button = DOMUtils.div({class: 'igv-navbar-button'})
    parent.append(button)

    button.textContent = 'Save JSON'
    button.addEventListener('click', () => browser.toJSON());
}

export default SaveJSONButton
