/**
 * @class PopupManager manages the popups on the page
 */
class PopupManager {

    #popups = [];
    #popupsScripts = [];

    constructor() {
        // add the popup css to the page
        Utils.addStyleSheet('style/popups/popups.css');

        // add the popups scripts to the page depending on the popups that are used
        // [KEY = id of the popup, VALUE = function to add the popup to the PopupManager]
        this.#popupsScripts['message-popup'] = () => this.#addMessagePopup();
        this.#popupsScripts['document-popup'] = () => this.#addDocumentPopup();
        this.#popupsScripts['clicked-popup'] = () => this.#addDocumentClickedPopup();

        // create an array to store the popups
        this.#popups = [];
        this.initialize();
    }

    /**
     * Add the script to the page and Add the message popup to the PopupManager
     * @returns Promise<void>
     */
    async #addMessagePopup() {
        await Utils.addScript('js/model/popups/Popup.js');
        await Utils.addScript('js/model/popups/MessagePopup.js');
        this.#addPopup(new MessagePopup());
    }

    /**
     * Add the script to the page and Add the add document popup to the PopupManager
     */
    async #addDocumentPopup() {
        await Utils.addScript('js/model/popups/Popup.js');
        await Utils.addScript('js/model/popups/AddDocumentPopup.js');
        this.#addPopup(new AddDocumentPopup());
    }

    /**
     * Add the script to the page and Add the document clicked popup to the PopupManager
     */
    async #addDocumentClickedPopup() {
        await Utils.addScript('js/model/popups/Popup.js');
        await Utils.addScript('js/model/popups/DocumentClickedPopup.js');
        this.#addPopup(new DocumentClickedPopup());
    }

    /**
     * Initialize the PopupManager by adding the popupContainer to the page
     */
    async initialize() {
        // take the body element
        let body = document.querySelector('main');

        // add a div with the id popupContainer
        let popupContainer = Utils.createHTMLElement('div', 'popupContainer', 'disabled');

        // add a div with the id popup
        body.appendChild(popupContainer);

        this.popupContainer = popupContainer;
    }

    /**
     * Open a popup with a specific id, throw an error if the popup does not exist
     * @param {string} id id of the popup to open
     * @returns Promise<void>
     */
    async open(id) {
        // we check if the script is already added to the page
        if (!this.#popupsScripts[id]) {
            throw new Error('Popup with id ' + id + ' does not exist');
        }

        // we wait for the script to be added to the page before opening the popup
        await this.#popupsScripts[id]();

        // check if the popup to be added to the PopupManager
        if (!this.#popups[id]) {
            throw new Error('Popup with id ' + id + ' does not exist');
        }

        // open the popup and remove the disabled class from the popupContainer
        this.popupContainer.classList.remove('disabled');
        this.#popups[id].open();
    }

    /**
     * Add a popup to the PopupManager
     * @param {? extends Popup} popup Popup to add to the PopupManager
     */
    #addPopup(popup) {
        this.#popups[popup.id] = popup;
    }
}