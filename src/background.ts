import ExchangeInfo from "./dts/ExchangeInfo";
import { isYtVideoTab } from "./helper";

interface ExtendedChromeTab extends chrome.tabs.Tab {
    comm_active: boolean;
}

let tabs: ExtendedChromeTab[] = [];

// Obtain all youtube (watch/video) tabs
chrome.tabs.query({}, (res) => {
    tabs = (res as ExtendedChromeTab[]).filter(tab => isYtVideoTab(tab.url))
    tabs.forEach(tab => tab.comm_active = false)
});

chrome.runtime.onMessage.addListener((req: ExchangeInfo, sender, sendResponse) => {
    if (req.action === 'popup-disable' && typeof req.value === 'boolean') setCurrentTabStatus(req.value, sendResponse)
    else if (req.action === 'tab-status') getCurrentTabStatus(sendResponse);
    else sendResponse({status: 404 });
    return true;
    // sendResponse({ status: status_code })
})

/**
 * Sets the specified tab as active sender while disabling all other active senders
 * to ensure only one active sender at a time.
 */
const changeTabStatus = (tab_id: number, status: boolean): boolean => {
    try { 
        tabs.forEach(tab => {
            if (tab.id == tab_id) tab.comm_active = status;
            else if (tab.comm_active) tab.comm_active = false;
        }); 
    }
    catch { return false;}
    return true;
}

const getCurrentTab = async(): Promise<chrome.tabs.Tab | null> => { 
    const res = await chrome.tabs.query({ active: true })
    return res[0] ?? null;
}

const saveNewTab = (tab: chrome.tabs.Tab) => {
    const ext_tab = tab as ExtendedChromeTab;
    ext_tab.comm_active = false;
    tabs.push(ext_tab);
    return ext_tab;
} 

const getCurrentTabStatus = async(sendResponse: Function) => {
    const tab = await getCurrentTab();
    if (tab?.id) {
        let matching_tab = tabs.filter(tab_item => tab_item.id === tab.id)[0];
        if (!matching_tab) matching_tab = saveNewTab(tab);
        sendResponse({ status: 200, value: matching_tab.comm_active });
    } else sendResponse({status: 505 });
}

const setCurrentTabStatus = async(value: boolean, sendResponse: Function) => {
    let status_code = 200;
    const tab = await getCurrentTab();
    if (tab?.id) {
        const res = changeTabStatus(tab.id, value);
        if (!res) status_code = 505;
    } else status_code == 505;
    sendResponse({ status: status_code });
}