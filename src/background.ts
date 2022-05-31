import { Constants } from "./constants";
import ExchangeInfo from "./dts/ExchangeInfo";
import VideoInfo from "./dts/VideoInfo";
import { isYtVideoTab } from "./helper";

interface ExtendedChromeTab extends chrome.tabs.Tab {
    comm_active: boolean;
}

const REQUEST_INTERVAL_DELAY = 10000;
const MIN_REQUEST_DELAY = 5000;
let last_video_info: VideoInfo | null = null;
let last_request: number | null = null;
let tabs: ExtendedChromeTab[] = [];
let request_interval: NodeJS.Timer | null = null;

// Obtain all youtube (watch/video) tabs
chrome.tabs.query({}, (res) => {
    tabs = (res as ExtendedChromeTab[]).filter(tab => isYtVideoTab(tab.url))
    tabs.forEach(tab => tab.comm_active = false)
});

chrome.runtime.onMessage.addListener((req: ExchangeInfo, sender, sendResponse) => {
    if (req.action === 'popup-disable' && typeof req.value === 'boolean') setCurrentTabStatus(req.value, sendResponse)
    else if (req.action === 'tab-status') getCurrentTabStatus(sendResponse);
    else if (req.action === 'jump' || req.action === 'pause' || req.action === 'play') requestTabInformation(true);
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

        const any_tabs_active = tabs.some(tab => tab.comm_active);
        if (!request_interval && any_tabs_active) {
            request_interval = setInterval(requestTabInformation, REQUEST_INTERVAL_DELAY);
            requestTabInformation();
        }
        else if (request_interval && !any_tabs_active) {
            clearInterval(request_interval);
            request_interval = null;
        }
    }
    catch { return false;}
    return true;
}

/**
 * Gets the active tab regardless of the url
 */
const getActiveTab = async(): Promise<chrome.tabs.Tab | null> => { 
    const res = await chrome.tabs.query({ active: true })
    return res[0] ?? null;
}

/**
 * Gets the currently active communication tab
 */
const getCommTab = (): ExtendedChromeTab | null => {
    const comm_tabs = tabs.filter(tab => tab.comm_active);
    if (comm_tabs.length > 0) return comm_tabs[0];
    return null;
}

/**
 * Save the specified tab into the list
 */
const saveNewTab = (tab: chrome.tabs.Tab) => {
    const ext_tab = tab as ExtendedChromeTab;
    ext_tab.comm_active = false;
    tabs.push(ext_tab);
    return ext_tab;
} 

/**
 * Removes the specified tab from the list
 */
const removeTab = (tab: ExtendedChromeTab | number): void => {
    const tab_id = (typeof tab === 'number') ? tab : tab.id;
    tabs = tabs.filter(tab_item => tab_item.id === tab_id);
}

/**
 * Gets the status of the currently active tab and additionally adds the tab to the list if its not listed yet.
 */
const getCurrentTabStatus = async(sendResponse: Function) => {
    const tab = await getActiveTab();
    if (tab?.id) {
        let matching_tab = tabs.filter(tab_item => tab_item.id === tab.id)[0];
        if (!matching_tab) matching_tab = saveNewTab(tab);
        sendResponse({ status: 200, value: matching_tab.comm_active });
    } else sendResponse({status: 505 });
}

/**
 * Sets the status of the current tab to mark or unmark it as the communication tab
 */
const setCurrentTabStatus = async(value: boolean, sendResponse: Function | null = null, existing_tab: ExtendedChromeTab | null = null) => {
    let status_code = 200;
    const tab = existing_tab ?? await getActiveTab();
    if (tab?.id) {
        if (!tabs.some(tab_item => tab_item.id === tab.id)) saveNewTab(tab);
        const res = changeTabStatus(tab.id, value);
        if (!res) status_code = 505;
    } else status_code == 505;
    if (sendResponse) sendResponse({ status: status_code });
}

/**
 * Request information from the active youtube tab and redirect the prepared data to the next communication node
 */
const requestTabInformation = (force_request = false) => {
    const comm_tab = getCommTab();
    if (comm_tab?.id && (force_request || !last_request || Date.now() - last_request > MIN_REQUEST_DELAY)) {
        chrome.tabs.sendMessage(comm_tab.id, { action: 'request-data' }, (video_info: VideoInfo) => {
            last_request = Date.now();
            if (video_info) {
                last_video_info = video_info;
                uploadCurrentVideoTimeStatus(video_info)
            }
            console.log(last_video_info);
        });
    }
}

/**
 * Pushes the video's current time status to the LaMetric's app
 */
const uploadCurrentVideoTimeStatus = (video_info: VideoInfo) => {
    return;
    // if (video_info.timestamp == null) return;
    // const push_data = {
    //     "frames":[
    //         {
    //             "icon": 10247,
    //             "text": video_info.timestamp / 1000 / 60
    //         }
    //     ]
    // }
    // fetch(Constants.PUSH_URL, {
    //     method: 'POST',
    //     mode: 'no-cors',
    //     headers: {
    //         'X-ACCESS-TOKEN': Constants.ACCESS_TOKEN,
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(push_data)
    // })
    // .then(res => {
    //     console.log(res.body);
    // })
    // .catch(err => console.log(err.message));
}

/**
 * TAB EVENT LISTENERS
 */

/**
 * Sets the closing tab as inactive communication tab if it was the active sender until now
 */
chrome.tabs.onRemoved.addListener((tab_id: number) => {
    const comm_tab = getCommTab();
    if (comm_tab?.id === tab_id) {
        setCurrentTabStatus(false, null, comm_tab);
        removeTab(comm_tab.id);
    }
});

/**
 * Wait for changes at any of the listed tabs and determine if the url has been changed to a non-youtube one
 */
chrome.tabs.onUpdated.addListener((tab_id: number, change_info: chrome.tabs.TabChangeInfo) => {
    const changed_tab = tabs.find(tab => tab.id === tab_id);
    if (changed_tab && change_info.url && !isYtVideoTab(change_info.url)) {
        if (changed_tab.comm_active) setCurrentTabStatus(false, null, changed_tab);
        removeTab(changed_tab);
    }
})


// fetch('http://3.13.86.142:3000/contacts', { mode: 'cors' })
// .then((res) => {
//     console.log(res);
// })

// fetch("http://3.13.86.142:3000/contacts", { mode: 'no-cors', method: 'GET' })
// .then(console.log);

// fetch("http://192.168.178.56:4343/api/v1/dev/widget/update/com.lametric.e4e6006ee8c67f6e6767f305dc866fc6/1", { mode: 'no-cors' })
// })

// fetch("http://192.168.178.56:4343/api/v1/dev/widget/update/com.lametric.e4e6006ee8c67f6e6767f305dc866fc6/1", { mode: 'no-cors', method: 'POST',  })
// .then(console.log);

// fetch()